import { LEVELS } from '../config/LevelConfig';
import { getLevelIndex, setLevelIndex } from '../config/Progress';
import { resetBoostersState } from '../config/BoostersProgress';
import GameStateModel from '../domain/game/GameStateModel';
import GameController from '../gameplay/GameController';
import BoostersView from '../presentation/BoostersView';
import FieldView from '../presentation/FieldView';
import HUDView from '../presentation/HUDView';
import ResultOverlayView from '../presentation/ResultOverlayView';
import FieldModel from '../domain/board/FieldModel';
import SpecialRegistry from '../features/specials/SpecialRegistry';
import BombBehavior from '../features/specials/behaviors/BombBehavior';
import RocketHBehavior from '../features/specials/behaviors/RocketHBehavior';
import RocketVBehavior from '../features/specials/behaviors/RocketVBehavior';
import SpecialCascadeResolver from '../domain/rules/SpecialCascadeResolver';
import MatchFinder from '../domain/rules/MatchFinder';
import MoveFinder from '../domain/rules/MoveFinder';

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

		this.hudView?.setLevel(levelIndex + 1);

		// Модель/стейт уровня
		const fieldModel = new FieldModel(8, 8);
		const gameState = new GameStateModel(level.moves, level.targetScore);

		// ✅ Гарантируем, что стартовое поле играбельно (есть ход)
		const matchFinder = new MatchFinder();
		const moveFinder = new MoveFinder(matchFinder);

		let tries = 0;
		const MAX_TRIES = 20;
		while (!moveFinder.hasAnyMove(fieldModel, 2) && tries < MAX_TRIES) {
			fieldModel.generate();
			tries++;
		}

		// Input
		this.fieldView?.setInputEnabled(true);

		// ===== Specials composition =====
		const specialRegistry = new SpecialRegistry();
		specialRegistry.register(new BombBehavior(1));
		specialRegistry.register(new RocketHBehavior());
		specialRegistry.register(new RocketVBehavior());

		const cascadeResolver = new SpecialCascadeResolver(specialRegistry);

		const controller = new GameController(
			fieldModel,
			gameState,
			this.fieldView,
			this.hudView,
			this.boostersView,
			cascadeResolver,
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
