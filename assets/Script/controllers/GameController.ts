import FieldModel from '../models/FieldModel';
import GameStateModel from '../models/GameStateModel';

export default class GameController {
	fieldModel: FieldModel;
	gameState: GameStateModel;

	constructor(fieldModel: FieldModel, gameState: GameStateModel) {
		this.fieldModel = fieldModel;
		this.gameState = gameState;
	}

	onTileClicked(x: number, y: number) {
		// Пока заглушка
		console.log(`Tile clicked at ${x}, ${y}`);
	}
}
