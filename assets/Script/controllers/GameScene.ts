import FieldModel from '../models/FieldModel';
import GameStateModel from '../models/GameStateModel';
import FieldView from '../views/FieldView';
import HUDView from '../views/HUDView';
import BoostersView from '../views/BoostersView';
import GameController from './GameController';
import ResultOverlayView from '../views/ResultOverlayView';

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameScene extends cc.Component {
	@property(FieldView)
	fieldView: FieldView = null;

	@property(HUDView)
	hudView: HUDView = null;

	@property(BoostersView)
	boostersView: BoostersView = null;

	@property(ResultOverlayView)
	resultOverlayView: ResultOverlayView = null;

	start() {
		const fieldModel = new FieldModel(8, 8);
		const gameState = new GameStateModel(37, 500);

		this.boostersView.setSwapCount(5);
		this.boostersView.setBombCount(3);
		this.fieldView.enableGlobalInput();

		const controller = new GameController(
			fieldModel,
			gameState,
			this.fieldView,
			this.hudView,
			this.boostersView
		);

		if (this.resultOverlayView) {
			this.resultOverlayView.onRestart = () => {
				cc.director.loadScene(cc.director.getScene().name);
			};
		}

		controller.onGameEnd = (type, reason) => {
			this.fieldView.setInputEnabled(false);

			if (!this.resultOverlayView) {
				cc.warn('[GameScene] resultOverlay is null');
				return;
			}

			if (type === 'win') {
				this.resultOverlayView.show('Победа!', reason);
			} else {
				this.resultOverlayView.show('Поражение', reason);
			}

			this.fieldView.disableGlobalInput();
		};
	}
}
