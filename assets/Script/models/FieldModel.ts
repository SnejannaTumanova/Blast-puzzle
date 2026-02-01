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

	/** Сколько попыток перегенерации поля, чтобы точно был хотя бы один ход */
	private readonly MAX_REGEN_TRIES = 20;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.grid = [];
		this.generate(); // гарантируем стартовое поле с ходом
	}

	// ===== Generate / Re-generate =====

	generate(minGroupSize: number = 2) {
		for (let attempt = 0; attempt < this.MAX_REGEN_TRIES; attempt++) {
			this.grid = [];
			for (let y = 0; y < this.height; y++) {
				const row: (TileModel | null)[] = [];
				for (let x = 0; x < this.width; x++) row.push(this.randomTile());
				this.grid.push(row);
			}

			// ✅ проверка играбельности на старте
			if (this.hasAnyMove(minGroupSize)) return;
		}

		// если вдруг совсем не повезло (очень маловероятно),
		// оставляем последнюю генерацию как есть
	}

	private randomTile(): TileModel {
		const color = this.colors[Math.floor(Math.random() * this.colors.length)];
		return new TileModel(color);
	}

	// ===== Basic access =====

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

	// ===== BOOSTERS =====

	/** Поменять два тайла местами (Swap booster) */
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

	// ===== Moves / Groups =====

	/**
	 * ✅ Быстрая проверка наличия ходов.
	 * - для minGroupSize <= 1: всегда true (сжечь можно любой тайл)
	 * - для minGroupSize == 2: достаточно проверить, есть ли сосед того же цвета
	 * - для minGroupSize > 2: делаем fallback на поиск групп (редкий кейс)
	 */
	hasAnyMove(minGroupSize: number = 2): boolean {
		if (minGroupSize <= 1) return true;

		if (minGroupSize === 2) {
			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					const t = this.grid[y][x];
					if (!t) continue;

					const c = t.color;

					// проверка вправо и вниз, чтобы не дублировать
					if (x + 1 < this.width) {
						const r = this.grid[y][x + 1];
						if (r && r.color === c) return true;
					}
					if (y + 1 < this.height) {
						const d = this.grid[y + 1][x];
						if (d && d.color === c) return true;
					}
				}
			}
			return false;
		}

		// fallback: для minGroupSize > 2
		const visited = new Set<string>();
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const t = this.grid[y][x];
				if (!t) continue;

				const key = `${x},${y}`;
				if (visited.has(key)) continue;

				const group = this.findGroup(x, y);
				for (const p of group) visited.add(`${p.x},${p.y}`);

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
			if (!this.isInside(nx, ny)) return;
			const key = `${nx},${ny}`;
			if (visited.has(key)) return;

			const t = this.grid[ny][nx];
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
	applyBurn(
		group: CellPos[],
		ensurePlayableAfter: boolean = false,
		minGroupSize: number = 2
	) {
		for (const p of group) {
			if (this.isInside(p.x, p.y)) this.grid[p.y][p.x] = null;
		}

		this.collapseDown();
		this.refillTop();

		// опционально: гарантировать, что после хода есть следующий ход
		if (ensurePlayableAfter && !this.hasAnyMove(minGroupSize)) {
			this.generate(minGroupSize);
		}
	}

	/** Сдвинуть тайлы вниз */
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

	/** Заполнить пустоты новыми тайлами */
	private refillTop() {
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				if (this.grid[y][x] === null) this.grid[y][x] = this.randomTile();
			}
		}
	}
}
