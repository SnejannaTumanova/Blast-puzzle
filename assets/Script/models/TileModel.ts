export enum TileColor {
	Blue = 'blue',
	Green = 'green',
	Red = 'red',
	Yellow = 'yellow',
	Purple = 'purple',
}

export default class TileModel {
	color: TileColor; // Цвет тайла
	isSpecial: boolean = false; // Супер-тайл или нет

	constructor(color: TileColor) {
		this.color = color;
	}
}
