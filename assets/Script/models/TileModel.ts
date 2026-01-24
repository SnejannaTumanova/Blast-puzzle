export default class TileModel {
	color: string; // Цвет тайла
	isSpecial: boolean = false; // Супер-тайл или нет

	constructor(color: string) {
		this.color = color;
	}
}
