import FieldModel from '../models/FieldModel';
import GameStateModel from '../models/GameStateModel';
import FieldView from '../views/FieldView';
import HUDView from '../views/HUDView';
import BoostersView from '../views/BoostersView';
import GameController from '../controllers/GameController';
import ResultOverlayView from '../views/ResultOverlayView';
import { LEVELS } from '../config/LevelConfig';
import { getLevelIndex, setLevelIndex } from '../config/Progress';
import { resetBoostersState } from '../config/BoostersProgress';

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
		const levelIndex = this.getSafeLevelIndex();
		const level = LEVELS[levelIndex];
		const isLastLevel = levelIndex >= LEVELS.length - 1;

		// HUD
		this.hudView?.setLevel(levelIndex + 1);

		// Модель/стейт уровня
		const fieldModel = new FieldModel(8, 8);
		const gameState = new GameStateModel(level.moves, level.targetScore);

		// Input
		this.fieldView?.setInputEnabled(true);

		const controller = new GameController(
			fieldModel,
			gameState,
			this.fieldView,
			this.hudView,
			this.boostersView
		);

		// Overlay callbacks
		if (this.resultOverlayView) {
			this.resultOverlayView.onRestart = () => {
				// ✅ тот же уровень; бустеры НЕ сбрасываем
				cc.director.loadScene(cc.director.getScene().name);
			};

			this.resultOverlayView.onNext = () => {
				if (isLastLevel) {
					// ✅ PLAY AGAIN → начать с 1 уровня и сбросить бустеры
					setLevelIndex(0);
					resetBoostersState({ swapLeft: 5, bombLeft: 3 });
				} else {
					// ✅ следующий уровень; бустеры НЕ сбрасываем
					setLevelIndex(levelIndex + 1);
				}

				cc.director.loadScene(cc.director.getScene().name);
			};
		}

		controller.onGameEnd = (type, reason) => {
			this.fieldView?.setInputEnabled(false);

			if (!this.resultOverlayView) return;

			if (type === 'win') {
				this.resultOverlayView.show({
					type: 'win',
					title: 'Победа!',
					body: reason,
					canNext: true,
					nextText: isLastLevel ? 'PLAY AGAIN' : 'NEXT LEVEL',
				});
			} else {
				this.resultOverlayView.show({
					type: 'lose',
					title: 'Поражение',
					body: reason,
					canNext: false,
					nextText: 'NEXT LEVEL',
				});
			}
		};
	}

	private getSafeLevelIndex(): number {
		const idx = getLevelIndex();
		if (idx < 0) return 0;
		if (idx >= LEVELS.length) return LEVELS.length - 1;
		return idx;
	}
}
