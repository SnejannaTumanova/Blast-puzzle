import FieldModel from '../../domain/board/FieldModel';
import { CellPos } from '../../domain/board/CellPos';
import { TileSpecial } from '../../domain/board/TileModel';

export interface ISpecialTileBehavior {
	readonly kind: TileSpecial;
	getAffectedCells(field: FieldModel, origin: CellPos): CellPos[];
}
