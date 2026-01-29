import FieldModel from '../models/FieldModel';
import TileModel from '../models/TileModel';
import TileView from './TileView';

const { ccclass, property } = cc._decorator;

type Pos = { x: number; y: number };

@ccclass
export default class FieldView extends cc.Component {
	@property(cc.Prefab)
	tilePrefab: cc.Prefab = null;

	@property
	tileSize: number = 80;

	@property
	gap: number = 10;

	@property
	offsetX: number = 0;

	@property
	offsetY: number = 0;

	@property
	debugDrawHitRects: boolean = false;

	onTileClick: ((x: number, y: number) => void) | null = null;

	private currentModel: FieldModel = null;
	private isAnimating = false;

	// матрица нод (viewY,x) — ВАЖНО: viewY === modelY (0 сверху)
	private tileNodes: (cc.Node | null)[][] = [];
	private builtW = 0;
	private builtH = 0;

	private tilesRoot: cc.Node = null;
	private debugRoot: cc.Node = null;

	private debugGfx: cc.Graphics = null;

	private inputEnabled: boolean = true;

	setInputEnabled(v: boolean) {
		this.inputEnabled = v;
	}

	onLoad() {
		this.tilesRoot = new cc.Node('TilesRoot');
		this.tilesRoot.parent = this.node;

		this.debugRoot = new cc.Node('DebugRoot');
		this.debugRoot.parent = this.node;
		this.debugRoot.zIndex = 999;

		this.debugGfx = this.debugRoot.addComponent(cc.Graphics);
		this.debugGfx.lineWidth = 2;
		this.debugGfx.strokeColor = cc.Color.CYAN;
	}

	onDestroy() {
		const canvas = cc.Canvas.instance?.node || cc.find('game/GameCanvas');
		if (canvas) {
			canvas.off(cc.Node.EventType.TOUCH_START, this.onGlobalTouch, this);
		}
	}

	// ===== Public API =====

	render(model: FieldModel) {
		this.currentModel = model;
		this.buildIfNeeded(model);
		this.syncToModelInstant(model);

		this.scheduleOnce(() => this.drawDebug(), 0);
	}

	playBurn(group: Pos[], done: () => void) {
		if (!group || group.length === 0) return done();

		this.isAnimating = true;

		let left = group.length;
		for (const p of group) {
			// group приходит в МОДЕЛЬНЫХ координатах (x,y), y=0 сверху — совпадает с viewY
			const vy = p.y;
			const node = this.getNode(p.x, vy);

			if (!node) {
				if (--left === 0) {
					this.isAnimating = false;
					done();
				}
				continue;
			}

			cc.tween(node)
				.to(0.12, { scale: 0 })
				.call(() => {
					node.destroy();
					this.setNode(p.x, vy, null);
					if (--left === 0) {
						this.isAnimating = false;
						done();
					}
				})
				.start();
		}
	}

	applyModelAnimated(model: FieldModel, done: () => void) {
		this.currentModel = model;
		this.buildIfNeeded(model);
		this.isAnimating = true;

		// 1) собрать все текущие ноды в map id -> node
		const idToNode = new Map<number, cc.Node>();
		for (let vy = 0; vy < this.tileNodes.length; vy++) {
			for (let x = 0; x < (this.tileNodes[vy]?.length ?? 0); x++) {
				const node = this.tileNodes[vy][x];
				if (!node) continue;
				const tv = node.getComponent(TileView);
				if (tv && tv.tileId !== -1) {
					idToNode.set(tv.tileId, node);
				}
			}
		}

		// 2) новая матрица
		const newNodes: (cc.Node | null)[][] = [];
		for (let vy = 0; vy < model.height; vy++) {
			newNodes.push(new Array(model.width).fill(null));
		}

		const tweens: cc.Tween[] = [];
		const usedIds = new Set<number>();

		// 3) пройти по НОВОЙ модели и расставить ноды (viewY === modelY)
		for (let vy = 0; vy < model.height; vy++) {
			for (let x = 0; x < model.width; x++) {
				const tileModel = model.getTile(x, vy);
				if (!tileModel) continue;

				const id = tileModel.id;
				let node = idToNode.get(id) ?? null;

				if (node) {
					usedIds.add(id);
					newNodes[vy][x] = node;

					// на всякий случай держим под tilesRoot
					if (this.tilesRoot && node.parent !== this.tilesRoot) {
						node.parent = this.tilesRoot;
					}

					// обновим визуал
					const tv = node.getComponent(TileView);
					tv.init(tileModel);

					const to = this.cellToPos(x, vy, model);
					tweens.push(cc.tween(node).to(0.18, { position: cc.v3(to.x, to.y) }));
				} else {
					// новый тайл — создать и уронить сверху
					node = this.createTileNode(tileModel, x, vy, model);
					newNodes[vy][x] = node;

					// спавним выше верхней строки
					const spawn = this.cellToPos(x, -2, model);
					node.setPosition(spawn.x, spawn.y);
					node.scale = 1;

					const to = this.cellToPos(x, vy, model);
					tweens.push(cc.tween(node).to(0.22, { position: cc.v3(to.x, to.y) }));
				}
			}
		}

		// 4) уничтожить ноды, которых больше нет в модели (сгоревшие)
		idToNode.forEach((node, id) => {
			if (!usedIds.has(id)) {
				if (node && node.isValid) node.destroy();
			}
		});

		// 5) применить новую матрицу
		this.tileNodes = newNodes;

		if (tweens.length === 0) {
			this.isAnimating = false;
			done();
			this.scheduleOnce(() => this.drawDebug(), 0);
			return;
		}

		let left = tweens.length;
		for (const t of tweens) {
			t.call(() => {
				if (--left === 0) {
					this.isAnimating = false;
					done();
					this.scheduleOnce(() => this.drawDebug(), 0);
				}
			}).start();
		}
	}

	// ===== Internal =====

	private buildIfNeeded(model: FieldModel) {
		if (
			this.builtW === model.width &&
			this.builtH === model.height &&
			this.tileNodes.length
		) {
			return;
		}

		// чистим ТОЛЬКО тайлы, а не debug
		if (this.tilesRoot) this.tilesRoot.removeAllChildren();

		this.builtW = model.width;
		this.builtH = model.height;

		// правильный размер без лишнего gap по краям
		const boardW = model.width * this.tileSize + (model.width - 1) * this.gap;
		const boardH = model.height * this.tileSize + (model.height - 1) * this.gap;

		this.node.setContentSize(boardW, boardH);
		this.node.setAnchorPoint(0.5, 0.5);

		this.tileNodes = [];
		for (let vy = 0; vy < model.height; vy++) {
			this.tileNodes.push(new Array(model.width).fill(null));
		}

		for (let vy = 0; vy < model.height; vy++) {
			for (let x = 0; x < model.width; x++) {
				const m = model.getTile(x, vy);
				if (!m) continue;
				this.tileNodes[vy][x] = this.createTileNode(m, x, vy, model);
			}
		}

		this.syncAllPositionsInstant(model);
	}

	private syncToModelInstant(model: FieldModel) {
		// если где-то не хватает нод — создадим/удалим
		for (let vy = 0; vy < model.height; vy++) {
			for (let x = 0; x < model.width; x++) {
				const m = model.getTile(x, vy);
				let node = this.tileNodes[vy][x];

				if (!m && node) {
					node.destroy();
					this.tileNodes[vy][x] = null;
					continue;
				}

				if (m && !node) {
					node = this.createTileNode(m, x, vy, model);
					this.tileNodes[vy][x] = node;
				}
			}
		}

		this.syncAllPositionsInstant(model);
		this.refreshTilesFromModel(model);
	}

	private refreshTilesFromModel(model: FieldModel) {
		for (let vy = 0; vy < model.height; vy++) {
			for (let x = 0; x < model.width; x++) {
				const node = this.tileNodes[vy][x];
				const tileModel = model.getTile(x, vy);
				if (!node || !tileModel) continue;

				const tv = node.getComponent(TileView);
				tv.init(tileModel);
			}
		}
	}

	private syncAllPositionsInstant(model: FieldModel) {
		for (let vy = 0; vy < model.height; vy++) {
			for (let x = 0; x < model.width; x++) {
				const node = this.tileNodes[vy][x];
				if (!node) continue;
				const p = this.cellToPos(x, vy, model);
				node.setPosition(p.x, p.y);
				node.scale = 1;
			}
		}
	}

	private createTileNode(
		tileModel: TileModel,
		x: number,
		viewY: number,
		model: FieldModel
	): cc.Node {
		const tile = cc.instantiate(this.tilePrefab);
		tile.parent = this.tilesRoot ? this.tilesRoot : this.node;

		tile.width = this.tileSize;
		tile.height = this.tileSize;

		const tv = tile.getComponent(TileView);
		tv.init(tileModel);

		return tile;
	}

	private getBoardOrigin(model: FieldModel) {
		const step = this.tileSize + this.gap;

		const totalW = model.width * this.tileSize + (model.width - 1) * this.gap;
		const totalH = model.height * this.tileSize + (model.height - 1) * this.gap;

		const startX = -totalW / 2 + this.tileSize / 2 + this.offsetX;
		const startY = totalH / 2 - this.tileSize / 2 + this.offsetY;

		return { startX, startY, step };
	}

	private cellToPos(x: number, viewY: number, model: FieldModel) {
		const o = this.getBoardOrigin(model);
		return {
			x: o.startX + x * o.step,
			y: o.startY - viewY * o.step,
		};
	}

	private getNode(x: number, viewY: number): cc.Node | null {
		if (viewY < 0 || viewY >= this.tileNodes.length) return null;
		if (x < 0 || x >= this.tileNodes[viewY].length) return null;
		return this.tileNodes[viewY][x];
	}

	private setNode(x: number, viewY: number, node: cc.Node | null) {
		if (viewY < 0 || viewY >= this.tileNodes.length) return;
		if (x < 0 || x >= this.tileNodes[viewY].length) return;
		this.tileNodes[viewY][x] = node;
	}

	// ===== Debug =====

	private drawDebug() {
		if (!this.debugGfx) return;

		const g = this.debugGfx;
		g.clear();

		if (!this.debugDrawHitRects || !this.currentModel) return;

		g.lineWidth = 2;
		g.strokeColor = cc.Color.CYAN;

		for (let vy = 0; vy < this.currentModel.height; vy++) {
			for (let x = 0; x < this.currentModel.width; x++) {
				const p = this.cellToPos(x, vy, this.currentModel);
				g.rect(
					p.x - this.tileSize / 2,
					p.y - this.tileSize / 2,
					this.tileSize,
					this.tileSize
				);
			}
		}
		g.stroke();
	}

	// ===== Input (global) =====

	private onGlobalTouch(e: cc.Event.EventTouch) {
		if (!this.inputEnabled) return;
		if (this.isAnimating || !this.currentModel) return;

		const screen = e.getLocation();
		const local = this.node.convertToNodeSpaceAR(cc.v3(screen.x, screen.y));

		const halfW = this.node.width / 2;
		const halfH = this.node.height / 2;

		// Быстрый отсев: вообще внутри прямоугольника доски?
		if (
			local.x < -halfW ||
			local.x > halfW ||
			local.y < -halfH ||
			local.y > halfH
		) {
			return;
		}

		const o = this.getBoardOrigin(this.currentModel);

		// relX/relY считаются от ЦЕНТРА (0,0) первой клетки (o.startX/o.startY)
		const relX = local.x - o.startX;
		const relY = o.startY - local.y;

		// Индекс клетки как "round", но стабильнее:
		const cx = Math.floor(relX / o.step + 0.5);
		const cy = Math.floor(relY / o.step + 0.5);

		if (cx < 0 || cx >= this.currentModel.width) return;
		if (cy < 0 || cy >= this.currentModel.height) return;

		// Проверка, что попали именно в тайл, а не в gap
		const dx = relX - cx * o.step;
		const dy = relY - cy * o.step;

		const inCellX = Math.abs(dx) <= this.tileSize / 2;
		const inCellY = Math.abs(dy) <= this.tileSize / 2;

		if (!inCellX || !inCellY) return;

		// ВАЖНО: стопаем только если реально обработали клик по тайлу
		e.stopPropagation();

		this.onTileClick && this.onTileClick(cx, cy);
	}

	enableGlobalInput() {
		const canvas = cc.Canvas.instance?.node;
		if (canvas) {
			canvas.on(cc.Node.EventType.TOUCH_START, this.onGlobalTouch, this);
		}
	}

	disableGlobalInput() {
		const canvas = cc.Canvas.instance?.node;
		if (canvas) {
			canvas.off(cc.Node.EventType.TOUCH_START, this.onGlobalTouch, this);
		}
	}
}
