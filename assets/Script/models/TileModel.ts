export enum TileColor {
	Blue = 'blue',
	Green = 'green',
	Red = 'red',
	Yellow = 'yellow',
	Purple = 'purple',
}

let TILE_ID_SEQ = 1;

export default class TileModel {
	readonly id: number;
	color: TileColor;
	isSpecial: boolean = false;

	constructor(color: TileColor) {
		this.id = TILE_ID_SEQ++;
		this.color = color;
	}
}
