import FieldModel from '../models/FieldModel';
import GameStateModel from '../models/GameStateModel';
import FieldView from '../views/FieldView';
import HUDView from '../views/HUDView';
import BoostersView from '../views/BoostersView';
import GameController from './GameController';
import ResultOverlayView from '../views/ResultOverlayView';
import { LEVELS } from '../config/LevelConfig';
import { getLevelIndex, setLevelIndex } from '../config/Progress';

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

		// UI
		this.boostersView?.setSwapCount(5);
		this.boostersView?.setBombCount(3);

		// Input
		this.fieldView?.setInputEnabled(true);
		this.fieldView?.enableGlobalInput();

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
				// тот же уровень
				cc.director.loadScene(cc.director.getScene().name);
			};

			this.resultOverlayView.onNext = () => {
				if (isLastLevel) {
					// ✅ последняя победа → начать заново с 1 уровня
					setLevelIndex(0);
				} else {
					// ✅ следующий уровень
					setLevelIndex(levelIndex + 1);
				}
				cc.director.loadScene(cc.director.getScene().name);
			};
		}

		controller.onGameEnd = (type, reason) => {
			this.fieldView?.setInputEnabled(false);
			this.fieldView?.disableGlobalInput();

			if (!this.resultOverlayView) return;

			if (type === 'win') {
				this.resultOverlayView.show({
					type: 'win',
					title: 'Победа!',
					body: reason,
					// ✅ показываем кнопку и на последнем уровне тоже
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
