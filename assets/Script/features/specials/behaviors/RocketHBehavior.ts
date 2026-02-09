import FieldModel from '../../../domain/board/FieldModel';
import { CellPos } from '../../../domain/board/CellPos';
import { TileSpecial } from '../../../domain/board/TileModel';
import { ISpecialTileBehavior } from '../ISpecialTileBehavior';

export default class RocketHBehavior implements ISpecialTileBehavior {
	readonly kind = TileSpecial.RocketH;

	getAffectedCells(field: FieldModel, origin: CellPos): CellPos[] {
		const res: CellPos[] = [];
		for (let x = 0; x < field.width; x++) {
			if (field.getTile(x, origin.y)) res.push({ x, y: origin.y });
		}
		return res;
	}
}
