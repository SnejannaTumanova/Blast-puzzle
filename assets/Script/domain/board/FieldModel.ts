import { CellPos } from './CellPos';
import TileModel, { TileColor, TileSpecial } from './TileModel';

export default class FieldModel {
	width: number;
	height: number;
	grid: (TileModel | null)[][];

	private colors: TileColor[] = [
		TileColor.Red,
		TileColor.Green,
		TileColor.Blue,
		TileColor.Yellow,
		TileColor.Purple,
	];

	/** Порог, начиная с которого создаём супер-тайл на месте клика */
	private readonly SPECIAL_THRESHOLD = 7;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.grid = [];
		this.generate();
	}

	// ===== Generate =====

	generate() {
		this.grid = [];
		for (let y = 0; y < this.height; y++) {
			const row: (TileModel | null)[] = [];
			for (let x = 0; x < this.width; x++) row.push(this.randomTile());
			this.grid.push(row);
		}
	}

	private randomTile(): TileModel {
		const color = this.colors[Math.floor(Math.random() * this.colors.length)];
		return new TileModel(color, TileSpecial.None);
	}

	private randomSpecial(): TileSpecial {
		const pool: TileSpecial[] = [
			TileSpecial.Bomb,
			TileSpecial.RocketH,
			TileSpecial.RocketV,
		];
		return pool[Math.floor(Math.random() * pool.length)];
	}

	private isInside(x: number, y: number): boolean {
		return x >= 0 && x < this.width && y >= 0 && y < this.height;
	}

	getTile(x: number, y: number): TileModel | null {
		if (!this.isInside(x, y)) return null;
		return this.grid[y][x];
	}

	setTile(x: number, y: number, t: TileModel | null) {
		if (!this.isInside(x, y)) return;
		this.grid[y][x] = t;
	}

	// ===== Helpers for actions (swap/bomb/specials use these) =====

	swapTiles(a: CellPos, b: CellPos) {
		if (!this.isInside(a.x, a.y) || !this.isInside(b.x, b.y)) return;

		const t1 = this.grid[a.y][a.x];
		const t2 = this.grid[b.y][b.x];
		this.grid[a.y][a.x] = t2;
		this.grid[b.y][b.x] = t1;
	}

	/** Клетки в квадратном радиусе R вокруг (x,y). Для 5x5 нужно R=2 */
	getCellsInRadius(x: number, y: number, r: number): CellPos[] {
		const res: CellPos[] = [];
		for (let yy = y - r; yy <= y + r; yy++) {
			for (let xx = x - r; xx <= x + r; xx++) {
				if (!this.isInside(xx, yy)) continue;
				if (!this.grid[yy][xx]) continue;
				res.push({ x: xx, y: yy });
			}
		}
		return res;
	}

	// ===== Apply move (burn/collapse/refill) =====

	/**
	 * Применить сжигание + падение + досып.
	 * Важно: метод НЕ проверяет "есть ли ходы" — это делает MoveFinder/контроллер.
	 */
	applyBurn(
		group: CellPos[],
		origin?: CellPos,
		allowSpawnSpecial: boolean = true,
	) {
		let spawnAt: CellPos | null = null;

		if (
			allowSpawnSpecial &&
			origin &&
			group.length >= this.SPECIAL_THRESHOLD &&
			this.isInside(origin.x, origin.y)
		) {
			spawnAt = origin;
		}

		// удалить всё, кроме spawnAt (если он есть)
		for (const p of group) {
			if (!this.isInside(p.x, p.y)) continue;
			if (spawnAt && p.x === spawnAt.x && p.y === spawnAt.y) continue;
			this.grid[p.y][p.x] = null;
		}

		// поставить спец в spawnAt
		if (spawnAt) {
			const prev = this.grid[spawnAt.y][spawnAt.x];
			const baseColor =
				prev?.color ??
				this.colors[Math.floor(Math.random() * this.colors.length)];

			this.grid[spawnAt.y][spawnAt.x] = new TileModel(
				baseColor,
				this.randomSpecial(),
			);
		}

		this.collapseDown();
		this.refillTop();
	}

	private collapseDown() {
		for (let x = 0; x < this.width; x++) {
			const col: TileModel[] = [];

			for (let y = this.height - 1; y >= 0; y--) {
				const t = this.grid[y][x];
				if (t) col.push(t);
			}

			for (let y = this.height - 1; y >= 0; y--) {
				const idx = this.height - 1 - y; // 0 внизу
				this.grid[y][x] = col[idx] ?? null;
			}
		}
	}

	private refillTop() {
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				if (this.grid[y][x] === null) this.grid[y][x] = this.randomTile();
			}
		}
	}
}
