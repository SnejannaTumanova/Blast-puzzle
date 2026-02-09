import { CellPos } from '../../../domain/board/CellPos';
import IBoosterAction from '../../../domain/boosters/IBoosterAction';
import BoosterContext from '../../../gameplay/boosters/BoosterContext';

export default class BombBoosterAction implements IBoosterAction {
	readonly kind = 'bomb' as const;

	onFieldClick(ctx: BoosterContext, pos: CellPos) {
		const { bombLeft } = ctx.getCounts();
		if (bombLeft <= 0) {
			ctx.endBoosterMode();
			return;
		}

		const cells = ctx.field.getCellsInRadius(pos.x, pos.y, ctx.bombRadius);
		if (!cells.length) {
			ctx.endBoosterMode();
			return;
		}

		ctx.setCounts({ ...ctx.getCounts(), bombLeft: bombLeft - 1 });
		ctx.boostersView.setBombCount(bombLeft - 1);
		ctx.saveBoosters();

		// бомба НЕ создаёт спецтайлы
		ctx.performBurnMove(cells, undefined, false);

		ctx.endBoosterMode();
	}
}
