import { CellPos } from '../../../domain/board/CellPos';
import IBoosterAction from '../../../domain/boosters/IBoosterAction';
import BoosterContext from '../../../gameplay/boosters/BoosterContext';

export default class SwapBoosterAction implements IBoosterAction {
	readonly kind = 'swap' as const;

	private first: CellPos | null = null;

	onEnter(ctx: BoosterContext) {
		this.first = null;
		ctx.fieldView.clearSelectedCell?.();
	}

	onExit(ctx: BoosterContext) {
		this.first = null;
		ctx.fieldView.clearSelectedCell?.();
	}

	onFieldClick(ctx: BoosterContext, pos: CellPos) {
		const { swapLeft } = ctx.getCounts();
		if (swapLeft <= 0) {
			ctx.endBoosterMode();
			return;
		}

		// первый клик
		if (!this.first) {
			this.first = pos;
			ctx.fieldView.showSelectedCell?.(pos.x, pos.y);
			return;
		}

		// второй клик
		const a = this.first;
		const b = pos;

		// кликнули по той же клетке — “сброс выбора”
		if (a.x === b.x && a.y === b.y) {
			this.first = null;
			ctx.fieldView.clearSelectedCell?.();
			return;
		}

		// списываем бустер
		ctx.setCounts({ ...ctx.getCounts(), swapLeft: swapLeft - 1 });
		ctx.boostersView.setSwapCount(swapLeft - 1);
		ctx.saveBoosters();

		ctx.setBusy(true);
		ctx.field.swapTiles(a, b);

		ctx.fieldView.applyModelAnimated(ctx.field, () => {
			// swap тратит ход
			ctx.gameState.movesLeft -= 1;
			ctx.hudView.setMoves(ctx.gameState.movesLeft);
			ctx.hudView.setScore(ctx.gameState.score, ctx.gameState.targetScore);

			// проверки проигрыша/ходов остаются в контроллере
			ctx.setBusy(false);
			ctx.afterSwapMove();
		});

		ctx.endBoosterMode();
	}
}
