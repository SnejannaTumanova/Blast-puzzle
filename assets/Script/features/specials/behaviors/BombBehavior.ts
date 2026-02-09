import FieldModel from '../../../domain/board/FieldModel';
import { CellPos } from '../../../domain/board/CellPos';
import { TileSpecial } from '../../../domain/board/TileModel';
import { ISpecialTileBehavior } from '../ISpecialTileBehavior';

export default class BombBehavior implements ISpecialTileBehavior {
	readonly kind = TileSpecial.Bomb;
	constructor(private radius = 1) {}

	getAffectedCells(field: FieldModel, origin: CellPos): CellPos[] {
		return field.getCellsInRadius(origin.x, origin.y, this.radius);
	}
}
