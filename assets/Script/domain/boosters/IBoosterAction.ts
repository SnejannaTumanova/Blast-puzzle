import { CellPos } from '../board/CellPos';
import BoosterContext from '../../gameplay/boosters/BoosterContext';
import { BoosterKind } from '../../features/boosters/BoosterKind';

export default interface IBoosterAction {
	readonly kind: BoosterKind; // 'bomb' | 'swap'
	onEnter?(ctx: BoosterContext): void;
	onExit?(ctx: BoosterContext): void;
	onFieldClick(ctx: BoosterContext, pos: CellPos): void;
}
