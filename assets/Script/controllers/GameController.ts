import FieldModel, { CellPos } from '../models/FieldModel';
import GameStateModel from '../models/GameStateModel';
import FieldView from '../views/FieldView';
import HUDView from '../views/HUDView';
import BoostersView from '../views/BoostersView';

export default class GameController {
	fieldModel: FieldModel;
	gameState: GameStateModel;

	fieldView: FieldView;
	hudView: HUDView;
	boostersView: BoostersView;

	private readonly MIN_GROUP = 2;
	private isBusy: boolean = false;

	constructor(
		fieldModel: FieldModel,
		gameState: GameStateModel,
		fieldView: FieldView,
		hudView: HUDView,
		boostersView: BoostersView
	) {
		this.fieldModel = fieldModel;
		this.gameState = gameState;
		this.fieldView = fieldView;
		this.hudView = hudView;
		this.boostersView = boostersView;

		this.fieldView.onTileClick = (x, y) => this.onTileClicked(x, y);

		this.refreshAll();
	}

	private refreshAll() {
		this.fieldView.render(this.fieldModel);
		this.hudView.setMoves(this.gameState.movesLeft);
		this.hudView.setScore(this.gameState.score, this.gameState.targetScore);
	}

	private onTileClicked(x: number, y: number) {
		if (this.isBusy) return;

		if (this.gameState.movesLeft <= 0) return;
		const tile = this.fieldModel.getTile(x, y);

		const group = this.fieldModel.getBurnGroup(x, y, this.MIN_GROUP);
		if (group.length === 0) return;

		this.isBusy = true;

		// анимация сгорания
		this.fieldView.playBurn(group, () => {
			this.fieldModel.applyBurn(group);

			// анимация падения и досыпа
			this.fieldView.applyModelAnimated(this.fieldModel, () => {
				this.gameState.movesLeft -= 1;

				const burned = group.length;
				const points = burned * 10 + Math.max(0, burned - 2) * 5;
				this.gameState.score += points;

				// HUD
				this.hudView.setMoves(this.gameState.movesLeft);
				this.hudView.setScore(this.gameState.score, this.gameState.targetScore);

				// win/lose
				if (this.gameState.isWin()) {
					this.isBusy = true;
					this.onGameEnd &&
						this.onGameEnd('win', `Очки: ${this.gameState.score}`);
					return;
				}

				if (this.gameState.isLose()) {
					this.isBusy = true;
					this.onGameEnd && this.onGameEnd('lose', 'Ходы закончились');
					return;
				}

				if (!this.fieldModel.hasAnyMove(this.MIN_GROUP)) {
					this.isBusy = true;
					this.onGameEnd && this.onGameEnd('lose', 'Нет доступных ходов');
					return;
				}

				this.isBusy = false;
			});
		});
	}

	onGameEnd: ((type: 'win' | 'lose', reason: string) => void) | null = null;
}
