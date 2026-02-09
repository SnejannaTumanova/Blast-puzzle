import { CellPos } from '../domain/board/CellPos';
import FieldModel from '../domain/board/FieldModel';
import TileModel from '../domain/board/TileModel';
import TileView from './TileView';

const { ccclass, property } = cc._decorator;

@ccclass
export default class FieldView extends cc.Component {
	@property(cc.Prefab)
	tilePrefab: cc.Prefab = null;

	/** Ширина клетки (лучше поставить = prefab tile width, у тебя 100) */
	@property
	cellW: number = 100;

	/** Высота клетки (лучше поставить = prefab tile height, у тебя 112) */
	@property
	cellH: number = 112;

	@property
	gap: number = 10;

	// Сдвиг доски относительно (0,0) FieldView
	@property
	offsetX: number = 0;

	@property
	offsetY: number = 0;

	// Debug: рисовать сетку клеток
	@property
	debugDrawHitRects: boolean = false;

	@property(cc.SpriteFrame)
	selectFrame: cc.SpriteFrame = null;

	onTileClick: ((x: number, y: number) => void) | null = null;

	onRightClick: (() => void) | null = null;

	private currentModel: FieldModel = null;
	private isAnimating = false;

	// матрица нод (viewY,x) — ВАЖНО: viewY === modelY (0 сверху)
	private tileNodes: (cc.Node | null)[][] = [];
	private builtW = 0;
	private builtH = 0;

	// Руты (чтобы removeAllChildren не убивал debug)
	private tilesRoot: cc.Node = null;
	private debugRoot: cc.Node = null;

	// Debug gfx (отдельный child поверх тайлов)
	private debugGfx: cc.Graphics = null;

	private inputEnabled: boolean = true;

	private selectedCell: { x: number; y: number } | null = null;

	private selectNode: cc.Node = null;

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

		const selNode = new cc.Node('SelectOverlay');
		selNode.parent = this.node;
		selNode.zIndex = 1000;
		selNode.opacity = 0;

		const sp = selNode.addComponent(cc.Sprite);
		sp.spriteFrame = this.selectFrame;

		// чтобы углы не тянулись (если настроил Borders у spriteFrame)
		sp.type = cc.Sprite.Type.SLICED;

		// размер выставим позже в drawSelectedCell()
		this.selectNode = selNode;
	}

	onEnable() {
		// ✅ Ловим тач прямо на FieldView (не на Canvas)
		this.enableInput();
	}

	onDisable() {
		this.disableInput();
	}

	onDestroy() {
		this.disableInput();
	}

	// ===== Public API =====

	render(model: FieldModel) {
		this.currentModel = model;
		this.buildIfNeeded(model);
		this.syncToModelInstant(model);
		this.scheduleOnce(() => this.drawDebug(), 0);
	}

	playBurn(group: CellPos[], done: () => void) {
		if (!group || group.length === 0) return done();

		this.isAnimating = true;

		let left = group.length;
		for (const p of group) {
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
				if (tv && tv.tileId !== -1) idToNode.set(tv.tileId, node);
			}
		}

		// 2) новая матрица
		const newNodes: (cc.Node | null)[][] = [];
		for (let vy = 0; vy < model.height; vy++) {
			newNodes.push(new Array(model.width).fill(null));
		}

		const tweens: cc.Tween[] = [];
		const usedIds = new Set<number>();

		// 3) пройти по новой модели и расставить ноды
		for (let vy = 0; vy < model.height; vy++) {
			for (let x = 0; x < model.width; x++) {
				const tileModel = model.getTile(x, vy);
				if (!tileModel) continue;

				const id = tileModel.id;
				let node = idToNode.get(id) ?? null;

				if (node) {
					usedIds.add(id);
					newNodes[vy][x] = node;

					if (this.tilesRoot && node.parent !== this.tilesRoot)
						node.parent = this.tilesRoot;

					const tv = node.getComponent(TileView);
					tv.init(tileModel);

					const to = this.cellToPos(x, vy, model);
					tweens.push(cc.tween(node).to(0.18, { position: cc.v3(to.x, to.y) }));
				} else {
					node = this.createTileNode(tileModel);
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

		// 4) уничтожить ноды, которых больше нет в модели
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

		this.scheduleOnce(() => this.drawSelectedCell(), 0);
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

		if (this.tilesRoot) this.tilesRoot.removeAllChildren();

		this.builtW = model.width;
		this.builtH = model.height;

		// ✅ разный размер клетки по X/Y
		const boardW = model.width * this.cellW + (model.width - 1) * this.gap;
		const boardH = model.height * this.cellH + (model.height - 1) * this.gap;

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
				this.tileNodes[vy][x] = this.createTileNode(m);
			}
		}

		this.syncAllPositionsInstant(model);
	}

	private syncToModelInstant(model: FieldModel) {
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
					node = this.createTileNode(m);
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

				node.getComponent(TileView)?.init(tileModel);
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

	private createTileNode(tileModel: TileModel): cc.Node {
		const tile = cc.instantiate(this.tilePrefab);
		tile.parent = this.tilesRoot ? this.tilesRoot : this.node;

		// ✅ НЕ меняем tile.width/height — пусть совпадает с prefab (100x112)
		tile.getComponent(TileView)?.init(tileModel);

		return tile;
	}

	private getBoardOrigin(model: FieldModel) {
		const stepX = this.cellW + this.gap;
		const stepY = this.cellH + this.gap;

		const totalW = model.width * this.cellW + (model.width - 1) * this.gap;
		const totalH = model.height * this.cellH + (model.height - 1) * this.gap;

		const startX = -totalW / 2 + this.cellW / 2 + this.offsetX;
		const startY = totalH / 2 - this.cellH / 2 + this.offsetY;

		return { startX, startY, stepX, stepY, totalW, totalH };
	}

	private cellToPos(x: number, viewY: number, model: FieldModel) {
		const o = this.getBoardOrigin(model);
		return {
			x: o.startX + x * o.stepX,
			y: o.startY - viewY * o.stepY,
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
					p.x - this.cellW / 2,
					p.y - this.cellH / 2,
					this.cellW,
					this.cellH,
				);
			}
		}
		g.stroke();

		this.scheduleOnce(() => this.drawSelectedCell(), 0);
	}

	// ===== Input (local) =====

	private onLocalTouch(e: cc.Event.EventTouch) {
		if (!this.inputEnabled) return;
		if (this.isAnimating || !this.currentModel) return;

		const screen = e.getLocation();
		const local = this.node.convertToNodeSpaceAR(cc.v3(screen.x, screen.y));

		const o = this.getBoardOrigin(this.currentModel);

		// координаты от верхнего-левого угла доски (в локальных координатах FieldView)
		const left = -o.totalW / 2 + this.offsetX;
		const top = o.totalH / 2 + this.offsetY;

		const px = local.x - left; // 0..totalW
		const py = top - local.y; // 0..totalH (вниз)

		// быстрый отсев по прямоугольнику доски
		if (px < 0 || px > o.totalW || py < 0 || py > o.totalH) return;

		const cx = Math.floor(px / o.stepX);
		const cy = Math.floor(py / o.stepY);

		if (cx < 0 || cx >= this.currentModel.width) return;
		if (cy < 0 || cy >= this.currentModel.height) return;

		// проверка gap: клик должен попасть в тело тайла, а не в промежуток
		const inCellX = px - cx * o.stepX <= this.cellW;
		const inCellY = py - cy * o.stepY <= this.cellH;
		if (!inCellX || !inCellY) return;

		e.stopPropagation();
		this.onTileClick?.(cx, cy);
	}

	private onMouseDown(e: cc.Event.EventMouse) {
		if (!this.inputEnabled) return;
		if (this.isAnimating || !this.currentModel) return;

		// ПКМ — отмена бустера/выбора
		if (e.getButton() === cc.Event.EventMouse.BUTTON_RIGHT) {
			e.stopPropagation();
			this.onRightClick?.();
			return;
		}

		// только ЛКМ считаем “кликом по клетке”
		if (e.getButton() !== cc.Event.EventMouse.BUTTON_LEFT) return;

		const screen = e.getLocation();
		const local = this.node.convertToNodeSpaceAR(cc.v3(screen.x, screen.y));

		const o = this.getBoardOrigin(this.currentModel);
		const left = -o.totalW / 2 + this.offsetX;
		const top = o.totalH / 2 + this.offsetY;

		const px = local.x - left;
		const py = top - local.y;

		if (px < 0 || px > o.totalW || py < 0 || py > o.totalH) return;

		const cx = Math.floor(px / o.stepX);
		const cy = Math.floor(py / o.stepY);

		if (cx < 0 || cx >= this.currentModel.width) return;
		if (cy < 0 || cy >= this.currentModel.height) return;

		const inCellX = px - cx * o.stepX <= this.cellW;
		const inCellY = py - cy * o.stepY <= this.cellH;
		if (!inCellX || !inCellY) return;

		e.stopPropagation();
		this.onTileClick?.(cx, cy);
	}

	enableInput() {
		if (cc.sys.isMobile) {
			this.node.on(cc.Node.EventType.TOUCH_START, this.onLocalTouch, this);
		} else {
			this.node.on(cc.Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
		}
	}

	disableInput() {
		this.node.off(cc.Node.EventType.TOUCH_START, this.onLocalTouch, this);
		this.node.off(cc.Node.EventType.MOUSE_DOWN, this.onMouseDown, this);
	}

	showSelectedCell(x: number, y: number) {
		this.selectedCell = { x, y };
		this.drawSelectedCell();
	}

	clearSelectedCell() {
		this.selectedCell = null;
		if (this.selectNode && this.selectNode.isValid) {
			this.selectNode.stopAllActions();
			this.selectNode.opacity = 0;
			this.selectNode.scale = 1;
		}
	}

	private drawSelectedCell() {
		if (!this.selectNode || !this.currentModel || !this.selectedCell) return;

		const { x, y } = this.selectedCell;
		const p = this.cellToPos(x, y, this.currentModel);

		const pad = 6;
		const w = this.cellW + pad * 2;
		const h = this.cellH + pad * 2;

		this.selectNode.setPosition(p.x, p.y);
		this.selectNode.setContentSize(w, h);

		this.selectNode.stopAllActions();
		this.selectNode.opacity = 0;
		this.selectNode.scale = 0.9;

		this.selectNode.runAction(
			cc.spawn(
				cc.fadeTo(0.1, 255),
				cc.sequence(cc.scaleTo(0.1, 1.06), cc.scaleTo(0.08, 1.0)),
			),
		);
	}
}
