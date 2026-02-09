import {
	getBoostersState,
	setBoostersState,
	BoostersState,
} from '../config/BoostersProgress';

import { CellPos } from '../domain/board/CellPos';
import FieldModel from '../domain/board/FieldModel';
import GameStateModel from '../domain/game/GameStateModel';

import MatchFinder from '../domain/rules/MatchFinder';
import MoveFinder from '../domain/rules/MoveFinder';
import SpecialCascadeResolver from '../domain/rules/SpecialCascadeResolver';

import BoostersView from '../presentation/BoostersView';
import FieldView from '../presentation/FieldView';
import HUDView from '../presentation/HUDView';

import { BoosterKind } from '../features/boosters/BoosterKind';
import BoosterRegistry from '../domain/boosters/BoosterRegistry';
import BoosterContext from '../gameplay/boosters/BoosterContext';

export default class GameController {
	fieldModel: FieldModel;
	gameState: GameStateModel;

	fieldView: FieldView;
	hudView: HUDView;
	boostersView: BoostersView;

	private readonly MIN_GROUP = 2;
	private readonly BOMB_RADIUS = 2;

	private isBusy = false;

	private readonly DEFAULT_BOOSTERS: BoostersState = {
		swapLeft: 5,
		bombLeft: 3,
	};

	private swapLeft = 0;
	private bombLeft = 0;

	private activeBooster: BoosterKind = 'none';

	private cascadeResolver: SpecialCascadeResolver;

	private matchFinder = new MatchFinder();
	private moveFinder = new MoveFinder(this.matchFinder);

	private boosterCtx: BoosterContext;

	constructor(
		fieldModel: FieldModel,
		gameState: GameStateModel,
		fieldView: FieldView,
		hudView: HUDView,
		boostersView: BoostersView,
		cascadeResolver: SpecialCascadeResolver,
		private boosterRegistry: BoosterRegistry,
	) {
		this.fieldModel = fieldModel;
		this.gameState = gameState;
		this.fieldView = fieldView;
		this.hudView = hudView;
		this.boostersView = boostersView;
		this.cascadeResolver = cascadeResolver;

		const saved = getBoostersState(this.DEFAULT_BOOSTERS);
		this.swapLeft = saved.swapLeft;
		this.bombLeft = saved.bombLeft;

		this.fieldView.onRightClick = () => {
			if (this.isBusy) return;
			this.endBoosterMode();
		};

		// создаём BoosterContext один раз
		this.boosterCtx = new BoosterContext(
			this.fieldModel,
			this.gameState,
			this.fieldView,
			this.hudView,
			this.boostersView,
			(group, origin, allowSpawnSpecial) =>
				this.performBurnMove(group, origin, allowSpawnSpecial ?? true),
			() => this.checkEndConditions(),
			(v) => (this.isBusy = v),
			() => this.endBoosterMode(),
			() => this.saveBoosters(),
			() => ({ swapLeft: this.swapLeft, bombLeft: this.bombLeft }),
			(c) => {
				this.swapLeft = c.swapLeft;
				this.bombLeft = c.bombLeft;
			},
			this.MIN_GROUP,
			this.BOMB_RADIUS,
		);

		// input
		this.fieldView.onTileClick = (x, y) => this.onTileClicked(x, y);

		// booster buttons
		this.boostersView.onBombClick = () => this.toggleBooster('bomb');
		this.boostersView.onSwapClick = () => this.toggleBooster('swap');

		this.refreshAll();
	}

	private refreshAll() {
		this.fieldView.render(this.fieldModel);

		this.hudView?.setMoves(this.gameState.movesLeft);
		this.hudView?.setScore(this.gameState.score, this.gameState.targetScore);

		this.boostersView?.setSwapCount(this.swapLeft);
		this.boostersView?.setBombCount(this.bombLeft);

		this.boostersView?.setActiveBooster?.(this.activeBooster);
	}

	private saveBoosters() {
		setBoostersState({ swapLeft: this.swapLeft, bombLeft: this.bombLeft });
	}

	// ===== Booster mode (no enums, no switch) =====

	private toggleBooster(kind: BoosterKind) {
		if (this.isBusy) return;
		if (kind === 'bomb' && this.bombLeft <= 0) return;
		if (kind === 'swap' && this.swapLeft <= 0) return;

		// повторный клик по активному — выключаем
		if (this.activeBooster === kind) {
			this.endBoosterMode();
			return;
		}

		// выключаем предыдущий
		if (this.activeBooster !== 'none') this.endBoosterMode();

		this.activeBooster = kind;
		this.boostersView?.setActiveBooster?.(kind);

		this.boosterRegistry.get(kind)?.onEnter?.(this.boosterCtx);
	}

	private endBoosterMode() {
		const action = this.boosterRegistry.get(this.activeBooster);
		action?.onExit?.(this.boosterCtx);

		this.activeBooster = 'none';
		this.fieldView?.clearSelectedCell?.();
		this.boostersView?.setActiveBooster?.('none');
	}

	private handleBoosterClick(x: number, y: number) {
		const action = this.boosterRegistry.get(this.activeBooster);
		if (!action) {
			this.endBoosterMode();
			return;
		}

		action.onFieldClick(this.boosterCtx, { x, y });

		// ВАЖНО: swap завершает ход асинхронно (после анимации),
		// поэтому проверки win/lose мы делаем не тут, а в местах:
		// - performBurnMove (обычный ход / бомба)
		// - callback внутри SwapBoosterAction (ниже мы добавим хук)
	}

	// ===== Input =====

	private onTileClicked(x: number, y: number) {
		if (this.isBusy) return;
		if (this.gameState.movesLeft <= 0) return;

		// если активен бустер — отдаём клики ему
		if (this.activeBooster !== 'none') {
			this.handleBoosterClick(x, y);
			return;
		}

		const tile = this.fieldModel.getTile(x, y);

		// спецтайл
		if (tile && tile.isSpecial) {
			const group = this.cascadeResolver.resolve(this.fieldModel, { x, y });
			if (!group.length) return;

			this.performBurnMove(group, { x, y }, false);
			return;
		}

		// обычная группа
		const group = this.matchFinder.getBurnGroup(
			this.fieldModel,
			{ x, y },
			this.MIN_GROUP,
		);

		if (!group.length) return;

		this.performBurnMove(group, { x, y }, true);
	}

	// ===== Shared move pipeline =====

	private performBurnMove(
		group: CellPos[],
		origin?: CellPos,
		allowSpawnSpecial: boolean = true,
	) {
		this.isBusy = true;

		this.fieldView.playBurn(group, () => {
			this.fieldModel.applyBurn(group, origin, allowSpawnSpecial);

			this.fieldView.applyModelAnimated(this.fieldModel, () => {
				// ход тратится
				this.gameState.movesLeft -= 1;

				// очки
				const burned = group.length;
				const points = burned * 10 + Math.max(0, burned - 2) * 5;
				this.gameState.score += points;

				// UI
				this.hudView?.setMoves(this.gameState.movesLeft);
				this.hudView?.setScore(
					this.gameState.score,
					this.gameState.targetScore,
				);

				// end checks
				this.checkEndConditions();
			});
		});
	}

	/**
	 * Унифицированная проверка конца игры.
	 * Её мы будем вызывать:
	 * - после обычного сжигания
	 * - после спец-каскада
	 * - после бомбы
	 * - после swap (после анимации) — см. ниже
	 */
	public checkEndConditions() {
		if (this.gameState.isWin()) {
			this.isBusy = true;
			this.onGameEnd?.('win', `Очки: ${this.gameState.score}`);
			return;
		}

		if (this.gameState.isLose()) {
			this.isBusy = true;
			this.onGameEnd?.('lose', 'Ходы закончились');
			return;
		}

		if (!this.moveFinder.hasAnyMove(this.fieldModel, this.MIN_GROUP)) {
			this.isBusy = true;
			this.onGameEnd?.('lose', 'Нет доступных ходов');
			return;
		}

		this.isBusy = false;
	}

	onGameEnd: ((type: 'win' | 'lose', reason: string) => void) | null = null;
}
