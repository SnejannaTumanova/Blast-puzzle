import TileModel, { TileColor } from './TileModel';

export type CellPos = { x: number; y: number };

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

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.grid = [];
		this.generate();
	}

	generate() {
		this.grid = [];
		for (let y = 0; y < this.height; y++) {
			const row: (TileModel | null)[] = [];
			for (let x = 0; x < this.width; x++) {
				row.push(this.randomTile());
			}
			this.grid.push(row);
		}
	}

	private randomTile(): TileModel {
		const color = this.colors[Math.floor(Math.random() * this.colors.length)];
		return new TileModel(color);
	}

	getTile(x: number, y: number): TileModel | null {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
		return this.grid[y][x];
	}

	setTile(x: number, y: number, t: TileModel | null) {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
		this.grid[y][x] = t;
	}

	// ===== BOOSTERS =====

	/** Поменять два тайла местами (Swap booster) */
	swapTiles(a: CellPos, b: CellPos) {
		if (!this.getTile(a.x, a.y) && this.getTile(a.x, a.y) !== null) return;
		if (!this.getTile(b.x, b.y) && this.getTile(b.x, b.y) !== null) return;

		// (проще) просто свапаем по индексам; null тоже свапается нормально
		const t1 = this.getTile(a.x, a.y);
		const t2 = this.getTile(b.x, b.y);
		this.setTile(a.x, a.y, t2);
		this.setTile(b.x, b.y, t1);
	}

	/** Клетки в квадратном радиусе R вокруг (x,y). Для 5x5 нужно R=2 */
	getCellsInRadius(x: number, y: number, r: number): CellPos[] {
		const res: CellPos[] = [];

		for (let yy = y - r; yy <= y + r; yy++) {
			for (let xx = x - r; xx <= x + r; xx++) {
				if (xx < 0 || xx >= this.width || yy < 0 || yy >= this.height) continue;
				if (!this.getTile(xx, yy)) continue; // не добавляем пустые
				res.push({ x: xx, y: yy });
			}
		}

		return res;
	}

	// ===== Moves / Groups =====

	/** Есть ли вообще ход (существует группа >=minGroupSize) */
	hasAnyMove(minGroupSize: number = 2): boolean {
		const visited = new Set<string>();

		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const t = this.getTile(x, y);
				if (!t) continue;

				const key = `${x},${y}`;
				if (visited.has(key)) continue;

				const group = this.findGroup(x, y);
				group.forEach((p) => visited.add(`${p.x},${p.y}`));

				if (group.length >= minGroupSize) return true;
			}
		}
		return false;
	}

	/** Найти группу одинакового цвета вокруг (x,y) */
	findGroup(x: number, y: number): CellPos[] {
		const start = this.getTile(x, y);
		if (!start) return [];

		const color = start.color;
		const stack: CellPos[] = [{ x, y }];
		const visited = new Set<string>();
		const result: CellPos[] = [];

		const pushIfValid = (nx: number, ny: number) => {
			const key = `${nx},${ny}`;
			if (visited.has(key)) return;
			const t = this.getTile(nx, ny);
			if (!t) return;
			if (t.color !== color) return;
			visited.add(key);
			stack.push({ x: nx, y: ny });
		};

		visited.add(`${x},${y}`);

		while (stack.length > 0) {
			const p = stack.pop()!;
			result.push(p);

			pushIfValid(p.x + 1, p.y);
			pushIfValid(p.x - 1, p.y);
			pushIfValid(p.x, p.y + 1);
			pushIfValid(p.x, p.y - 1);
		}

		return result;
	}

	/** Получить группу для сжигания (или пусто, если меньше minGroupSize) */
	getBurnGroup(x: number, y: number, minGroupSize: number = 2): CellPos[] {
		const g = this.findGroup(x, y);
		return g.length >= minGroupSize ? g : [];
	}

	/** Применить сжигание + падение + досып */
	applyBurn(group: CellPos[]) {
		for (const p of group) {
			this.grid[p.y][p.x] = null;
		}
		this.collapseDown();
		this.refillTop();
	}

	/** Сдвинуть тайлы вниз */
	private collapseDown() {
		for (let x = 0; x < this.width; x++) {
			const col: (TileModel | null)[] = [];

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
		for (let x = 0; x < this.width; x++) {
			for (let y = 0; y < this.height; y++) {
				if (this.grid[y][x] === null) {
					this.grid[y][x] = this.randomTile();
				}
			}
		}
	}
}
