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
	resultOverlay: ResultOverlayView = null;

	start() {
		cc.log(
			'[GameScene] start. fieldView=',
			!!this.fieldView,
			'tilePrefab=',
			!!this.fieldView?.tilePrefab
		);

		const fieldModel = new FieldModel(8, 8);
		const gameState = new GameStateModel(37, 500);

		cc.log('[GameScene] models created');

		// начальные бустеры (пока просто UI)
		this.boostersView.setSwapCount(5);
		this.boostersView.setBombCount(3);

		// ✅ создаём контроллер
		const controller = new GameController(
			fieldModel,
			gameState,
			this.fieldView,
			this.hudView,
			this.boostersView
		);

		cc.log('[GameScene] controller created');

		// ✅ restart
		if (this.resultOverlay) {
			this.resultOverlay.onRestart = () => {
				cc.director.loadScene(cc.director.getScene().name);
			};
		}

		// ✅ обработка конца игры
		controller.onGameEnd = (type, reason) => {
			this.fieldView.setInputEnabled(false);

			if (!this.resultOverlay) return;

			if (type === 'win') {
				this.resultOverlay.show('Победа!', reason);
			} else {
				this.resultOverlay.show('Поражение', reason);
			}
		};
	}
}
