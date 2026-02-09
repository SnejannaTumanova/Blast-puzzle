import FieldModel from '../../../domain/board/FieldModel';
import { CellPos } from '../../../domain/board/CellPos';
import { TileSpecial } from '../../../domain/board/TileModel';
import { ISpecialTileBehavior } from '../ISpecialTileBehavior';

export default class RocketVBehavior implements ISpecialTileBehavior {
	readonly kind = TileSpecial.RocketV;

	getAffectedCells(field: FieldModel, origin: CellPos): CellPos[] {
		const res: CellPos[] = [];
		for (let y = 0; y < field.height; y++) {
			if (field.getTile(origin.x, y)) res.push({ x: origin.x, y });
		}
		return res;
	}
}
