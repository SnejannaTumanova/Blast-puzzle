import TileModel, { TileColor } from './TileModel';

export default class FieldModel {
	width: number;
	height: number;
	grid: (TileModel | null)[][];

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.grid = [];

		this.generate();
	}

	generate() {
		this.grid = [];

		const colors: TileColor[] = [
			TileColor.Red,
			TileColor.Green,
			TileColor.Blue,
			TileColor.Yellow,
			TileColor.Purple,
		];

		for (let y = 0; y < this.height; y++) {
			const row: (TileModel | null)[] = [];

			for (let x = 0; x < this.width; x++) {
				const color = colors[Math.floor(Math.random() * colors.length)];
				row.push(new TileModel(color));
			}

			this.grid.push(row);
		}
	}

	getTile(x: number, y: number): TileModel | null {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
		return this.grid[y][x];
	}
}
