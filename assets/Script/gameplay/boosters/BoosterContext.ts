import FieldView from '../../presentation/FieldView';
import BoostersView from '../../presentation/BoostersView';
import HUDView from '../../presentation/HUDView';
import { CellPos } from '../../domain/board/CellPos';
import FieldModel from '../../domain/board/FieldModel';
import GameStateModel from '../../domain/game/GameStateModel';

export type BurnMoveFn = (
	group: CellPos[],
	origin?: CellPos,
	allowSpawnSpecial?: boolean,
) => void;

export default class BoosterContext {
	constructor(
		public field: FieldModel,
		public gameState: GameStateModel,
		public fieldView: FieldView,
		public hudView: HUDView,
		public boostersView: BoostersView,
		public performBurnMove: BurnMoveFn,
		public afterSwapMove: () => void,
		public setBusy: (v: boolean) => void,
		public endBoosterMode: () => void, // выключить режим бустера + очистить selection
		public saveBoosters: () => void, // сохранить localStorage
		public getCounts: () => { swapLeft: number; bombLeft: number },
		public setCounts: (c: { swapLeft: number; bombLeft: number }) => void,
		public minGroupSize: number,
		public bombRadius: number,
	) {}
}
