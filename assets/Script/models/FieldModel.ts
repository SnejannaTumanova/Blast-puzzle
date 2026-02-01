import TileModel, { TileColor, TileSpecial } from './TileModel';

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

	/** Порог, начиная с которого создаём супер-тайл на месте клика */
	private readonly SPECIAL_THRESHOLD = 7;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.grid = [];
		this.generate(2);
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

			if (this.hasAnyMove(minGroupSize)) return;
		}
		// если совсем не повезло — оставляем последнюю генерацию
	}

	private randomTile(): TileModel {
		const color = this.colors[Math.floor(Math.random() * this.colors.length)];
		return new TileModel(color, TileSpecial.None);
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

	// ===== BOOSTERS (swap/bomb use these) =====

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
	 * - если на поле есть хотя бы 1 спецтайл — ход существует (его можно активировать кликом)
	 * - для minGroupSize==2: достаточно найти пару соседей одинакового цвета (НЕ спецтайлы)
	 */
	hasAnyMove(minGroupSize: number = 2): boolean {
		// спецтайл = гарантированный ход
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const t = this.grid[y][x];
				if (t?.isSpecial) return true;
			}
		}

		if (minGroupSize <= 1) return true;

		if (minGroupSize === 2) {
			for (let y = 0; y < this.height; y++) {
				for (let x = 0; x < this.width; x++) {
					const t = this.grid[y][x];
					if (!t || t.isSpecial) continue;

					const c = t.color;

					// вправо/вниз (без дублей)
					if (x + 1 < this.width) {
						const r = this.grid[y][x + 1];
						if (r && !r.isSpecial && r.color === c) return true;
					}
					if (y + 1 < this.height) {
						const d = this.grid[y + 1][x];
						if (d && !d.isSpecial && d.color === c) return true;
					}
				}
			}
			return false;
		}

		// fallback (если вдруг захочешь minGroupSize > 2)
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const g = this.getBurnGroup(x, y, minGroupSize);
				if (g.length > 0) return true;
			}
		}
		return false;
	}

	/** Группа одинакового цвета вокруг (x,y). Спецтайлы НЕ участвуют в обычных группах. */
	findGroup(x: number, y: number): CellPos[] {
		const start = this.getTile(x, y);
		if (!start) return [];
		if (start.isSpecial) return []; // спецтайл активируется отдельно (клик -> спец-логика)

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
			if (t.isSpecial) return; // спецтайлы не добавляем в обычную группу
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

	getBurnGroup(x: number, y: number, minGroupSize: number = 2): CellPos[] {
		const g = this.findGroup(x, y);
		return g.length >= minGroupSize ? g : [];
	}

	// ===== Specials (super tiles + chains) =====

	private randomSpecial(): TileSpecial {
		const pool: TileSpecial[] = [
			TileSpecial.Bomb,
			TileSpecial.RocketH,
			TileSpecial.RocketV,
		];
		return pool[Math.floor(Math.random() * pool.length)];
	}

	private getSpecialArea(
		x: number,
		y: number,
		special: TileSpecial
	): CellPos[] {
		const res: CellPos[] = [];

		if (special === TileSpecial.Bomb) {
			// 3x3 => radius = 1
			for (let yy = y - 1; yy <= y + 1; yy++) {
				for (let xx = x - 1; xx <= x + 1; xx++) {
					if (!this.isInside(xx, yy)) continue;
					if (!this.grid[yy][xx]) continue;
					res.push({ x: xx, y: yy });
				}
			}
			return res;
		}

		if (special === TileSpecial.RocketH) {
			// row
			for (let xx = 0; xx < this.width; xx++) {
				if (this.grid[y][xx]) res.push({ x: xx, y });
			}
			return res;
		}

		if (special === TileSpecial.RocketV) {
			// col
			for (let yy = 0; yy < this.height; yy++) {
				if (this.grid[yy][x]) res.push({ x, y: yy });
			}
			return res;
		}

		return res;
	}

	/**
	 * Цепная реакция: если в зоне есть другие спецтайлы — добавляем их эффект тоже.
	 * Возвращает полный список клеток к сжиганию.
	 */
	getSpecialCascadeGroup(x: number, y: number): CellPos[] {
		const start = this.getTile(x, y);
		if (!start || !start.isSpecial) return [];

		const queue: CellPos[] = [{ x, y }];
		const processedSpecial = new Set<string>();
		const burn = new Set<string>();

		while (queue.length > 0) {
			const p = queue.shift()!;
			const key = `${p.x},${p.y}`;
			if (processedSpecial.has(key)) continue;
			processedSpecial.add(key);

			const t = this.getTile(p.x, p.y);
			if (!t || !t.isSpecial) continue;

			const area = this.getSpecialArea(p.x, p.y, t.special);
			for (const c of area) {
				const k = `${c.x},${c.y}`;
				burn.add(k);

				const tt = this.getTile(c.x, c.y);
				if (tt?.isSpecial) {
					queue.push({ x: c.x, y: c.y });
				}
			}
		}

		// burn set -> array
		const result: CellPos[] = [];
		burn.forEach((k) => {
			const [sx, sy] = k.split(',').map((n) => parseInt(n, 10));
			result.push({ x: sx, y: sy });
		});
		return result;
	}

	// ===== Burn / Collapse / Refill =====

	/**
	 * Применить сжигание + падение + досып
	 * - origin: точка клика (чтобы создать спецтайл именно там)
	 * - allowSpawnSpecial: создавать ли спецтайл при большом матче (true для обычного клика; false для бустеров/цепочек)
	 */
	applyBurn(
		group: CellPos[],
		origin?: CellPos,
		allowSpawnSpecial: boolean = true,
		ensurePlayableAfter: boolean = false,
		minGroupSize: number = 2
	) {
		let spawnAt: CellPos | null = null;

		// если большой матч — создаём спецтайл на origin (заменяя тайл в origin)
		if (
			allowSpawnSpecial &&
			origin &&
			group.length >= this.SPECIAL_THRESHOLD &&
			this.isInside(origin.x, origin.y)
		) {
			spawnAt = origin;
		}

		// удаляем клетки группы; если spawnAt внутри — НЕ удаляем её, заменим на спецтайл
		for (const p of group) {
			if (!this.isInside(p.x, p.y)) continue;
			if (spawnAt && p.x === spawnAt.x && p.y === spawnAt.y) continue;
			this.grid[p.y][p.x] = null;
		}

		// ставим спецтайл в spawnAt (цвет берём от исходного тайла, который был в origin)
		if (spawnAt) {
			const prev = this.grid[spawnAt.y][spawnAt.x];
			const baseColor =
				prev?.color ??
				this.colors[Math.floor(Math.random() * this.colors.length)];

			this.grid[spawnAt.y][spawnAt.x] = new TileModel(
				baseColor,
				this.randomSpecial()
			);
		}

		this.collapseDown();
		this.refillTop();

		// опционально: гарантировать, что после хода есть следующий ход
		if (ensurePlayableAfter && !this.hasAnyMove(minGroupSize)) {
			this.generate(minGroupSize);
		}
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
