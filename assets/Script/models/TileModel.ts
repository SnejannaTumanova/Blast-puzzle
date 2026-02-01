export enum TileColor {
	Blue = 'blue',
	Green = 'green',
	Red = 'red',
	Yellow = 'yellow',
	Purple = 'purple',
}

export enum TileSpecial {
	None = 'none',
	Bomb = 'bomb', // 3x3
	RocketH = 'rocket_h', // row
	RocketV = 'rocket_v', // col
}

let TILE_ID_SEQ = 1;

export default class TileModel {
	readonly id: number;
	color: TileColor;
	special: TileSpecial = TileSpecial.None;

	constructor(color: TileColor, special: TileSpecial = TileSpecial.None) {
		this.id = TILE_ID_SEQ++;
		this.color = color;
		this.special = special;
	}

	get isSpecial(): boolean {
		return this.special !== TileSpecial.None;
	}
}
