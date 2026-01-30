import FieldModel, { CellPos } from '../models/FieldModel';
import GameStateModel from '../models/GameStateModel';
import FieldView from '../views/FieldView';
import HUDView from '../views/HUDView';
import BoostersView, { BoosterKind } from '../views/BoostersView';
import {
	getBoostersState,
	setBoostersState,
	BoostersState,
} from '../config/BoostersProgress';

enum BoosterMode {
	None = 'None',
	Bomb = 'Bomb',
	Swap_First = 'Swap_First',
	Swap_Second = 'Swap_Second',
}

export default class GameController {
	fieldModel: FieldModel;
	gameState: GameStateModel;

	fieldView: FieldView;
	hudView: HUDView;
	boostersView: BoostersView;

	private readonly MIN_GROUP = 2;
	private isBusy = false;

	private boosterMode: BoosterMode = BoosterMode.None;
	private swapFirst: CellPos | null = null;

	private readonly BOMB_RADIUS = 2;

	private readonly DEFAULT_BOOSTERS: BoostersState = {
		swapLeft: 5,
		bombLeft: 3,
	};

	private swapLeft = 0;
	private bombLeft = 0;

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

		// ✅ load boosters
		const saved = getBoostersState(this.DEFAULT_BOOSTERS);
		this.swapLeft = saved.swapLeft;
		this.bombLeft = saved.bombLeft;

		// input
		this.fieldView.onTileClick = (x, y) => this.onTileClicked(x, y);

		// boosters callbacks
		this.boostersView.onBombClick = () => this.toggleBombMode();
		this.boostersView.onSwapClick = () => this.toggleSwapMode();

		this.refreshAll();
	}

	// ===== UI sync =====

	private refreshAll() {
		this.fieldView.render(this.fieldModel);

		this.hudView?.setMoves(this.gameState.movesLeft);
		this.hudView?.setScore(this.gameState.score, this.gameState.targetScore);

		this.boostersView?.setSwapCount(this.swapLeft);
		this.boostersView?.setBombCount(this.bombLeft);

		this.syncBoosterUI();
	}

	private syncBoosterUI() {
		const kind: BoosterKind =
			this.boosterMode === BoosterMode.Bomb
				? 'bomb'
				: this.boosterMode === BoosterMode.Swap_First ||
				  this.boosterMode === BoosterMode.Swap_Second
				? 'swap'
				: 'none';

		this.boostersView?.setActiveBooster?.(kind);
	}

	private saveBoosters() {
		setBoostersState({ swapLeft: this.swapLeft, bombLeft: this.bombLeft });
	}

	// ===== Booster toggles =====

	private resetBoosterMode() {
		this.boosterMode = BoosterMode.None;
		this.swapFirst = null;

		// ✅ убрать рамку выбора
		this.fieldView?.clearSelectedCell?.();

		this.syncBoosterUI();
	}

	private toggleBombMode() {
		if (this.isBusy) return;
		if (this.bombLeft <= 0) return;

		if (this.boosterMode === BoosterMode.Bomb) {
			this.resetBoosterMode();
			return;
		}

		this.boosterMode = BoosterMode.Bomb;
		this.swapFirst = null;

		// ✅ на всякий случай чистим рамку (если до этого был swap)
		this.fieldView?.clearSelectedCell?.();

		this.syncBoosterUI();
	}

	private toggleSwapMode() {
		if (this.isBusy) return;
		if (this.swapLeft <= 0) return;

		const isAlready =
			this.boosterMode === BoosterMode.Swap_First ||
			this.boosterMode === BoosterMode.Swap_Second;
		if (isAlready) {
			this.resetBoosterMode();
			return;
		}

		this.boosterMode = BoosterMode.Swap_First;
		this.swapFirst = null;

		// ✅ рамку пока не показываем — покажем после выбора первой клетки
		this.fieldView?.clearSelectedCell?.();

		this.syncBoosterUI();
	}

	// ===== Input =====

	private onTileClicked(x: number, y: number) {
		if (this.isBusy) return;
		if (this.gameState.movesLeft <= 0) return;

		// если выбран бустер — обрабатываем его
		if (this.boosterMode !== BoosterMode.None) {
			this.handleBoosterClick(x, y);
			return;
		}

		// обычный burn
		const group = this.fieldModel.getBurnGroup(x, y, this.MIN_GROUP);
		if (group.length === 0) return;

		this.performBurnMove(group);
	}

	private handleBoosterClick(x: number, y: number) {
		switch (this.boosterMode) {
			case BoosterMode.Bomb: {
				if (this.bombLeft <= 0) {
					this.resetBoosterMode();
					return;
				}

				const cells = this.fieldModel.getCellsInRadius(x, y, this.BOMB_RADIUS);
				if (!cells || cells.length === 0) {
					this.resetBoosterMode();
					return;
				}

				// spend + save
				this.bombLeft -= 1;
				this.boostersView?.setBombCount(this.bombLeft);
				this.saveBoosters();

				this.performBurnMove(cells);
				this.resetBoosterMode();
				return;
			}

			case BoosterMode.Swap_First: {
				if (this.swapLeft <= 0) {
					this.resetBoosterMode();
					return;
				}

				this.swapFirst = { x, y };
				this.boosterMode = BoosterMode.Swap_Second;

				// ✅ подсветить выбранный тайл
				this.fieldView?.showSelectedCell?.(x, y);

				this.syncBoosterUI();
				return;
			}

			case BoosterMode.Swap_Second: {
				if (this.swapLeft <= 0) {
					this.resetBoosterMode();
					return;
				}
				if (!this.swapFirst) {
					this.boosterMode = BoosterMode.Swap_First;
					this.syncBoosterUI();
					return;
				}

				const a = this.swapFirst;
				const b = { x, y };

				// если кликнули тот же тайл — отмена выбора
				if (a.x === b.x && a.y === b.y) {
					this.swapFirst = null;
					this.boosterMode = BoosterMode.Swap_First;

					// ✅ убрать рамку
					this.fieldView?.clearSelectedCell?.();

					this.syncBoosterUI();
					return;
				}

				// spend + save
				this.swapLeft -= 1;
				this.boostersView?.setSwapCount(this.swapLeft);
				this.saveBoosters();

				this.isBusy = true;

				this.fieldModel.swapTiles(a, b);

				this.fieldView.applyModelAnimated(this.fieldModel, () => {
					// swap = ход
					this.gameState.movesLeft -= 1;

					this.hudView?.setMoves(this.gameState.movesLeft);
					this.hudView?.setScore(
						this.gameState.score,
						this.gameState.targetScore
					);

					if (this.gameState.isLose()) {
						this.isBusy = true;
						this.onGameEnd?.('lose', 'Ходы закончились');
						return;
					}

					if (!this.fieldModel.hasAnyMove(this.MIN_GROUP)) {
						this.isBusy = true;
						this.onGameEnd?.('lose', 'Нет доступных ходов');
						return;
					}

					this.isBusy = false;
				});

				this.resetBoosterMode();
				return;
			}

			default:
				this.resetBoosterMode();
				return;
		}
	}

	// ===== Shared move pipeline =====

	private performBurnMove(group: CellPos[]) {
		this.isBusy = true;

		this.fieldView.playBurn(group, () => {
			this.fieldModel.applyBurn(group);

			this.fieldView.applyModelAnimated(this.fieldModel, () => {
				this.gameState.movesLeft -= 1;

				const burned = group.length;
				const points = burned * 10 + Math.max(0, burned - 2) * 5;
				this.gameState.score += points;

				this.hudView?.setMoves(this.gameState.movesLeft);
				this.hudView?.setScore(
					this.gameState.score,
					this.gameState.targetScore
				);

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

				if (!this.fieldModel.hasAnyMove(this.MIN_GROUP)) {
					this.isBusy = true;
					this.onGameEnd?.('lose', 'Нет доступных ходов');
					return;
				}

				this.isBusy = false;
			});
		});
	}

	onGameEnd: ((type: 'win' | 'lose', reason: string) => void) | null = null;
}
