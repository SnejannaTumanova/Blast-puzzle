import { TileSpecial } from '../../domain/board/TileModel';
import { ISpecialTileBehavior } from './ISpecialTileBehavior';

export default class SpecialRegistry {
	private map = new Map<TileSpecial, ISpecialTileBehavior>();

	register(b: ISpecialTileBehavior) {
		this.map.set(b.kind, b);
	}

	get(kind: TileSpecial): ISpecialTileBehavior {
		const b = this.map.get(kind);
		if (!b) throw new Error(`Special behavior not registered: ${kind}`);
		return b;
	}
}
