import IBoosterAction from './IBoosterAction';
import { BoosterKind } from '../../features/boosters/BoosterKind';

export default class BoosterRegistry {
	private map = new Map<BoosterKind, IBoosterAction>();

	register(action: IBoosterAction) {
		this.map.set(action.kind, action);
	}

	get(kind: BoosterKind): IBoosterAction | null {
		return this.map.get(kind) ?? null;
	}
}
