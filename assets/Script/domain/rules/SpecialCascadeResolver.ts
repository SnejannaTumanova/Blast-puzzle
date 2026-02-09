import FieldModel from '../board/FieldModel';
import { CellPos } from '../board/CellPos';
import SpecialRegistry from '../../features/specials/SpecialRegistry';

export default class SpecialCascadeResolver {
	constructor(private registry: SpecialRegistry) {}

	resolve(field: FieldModel, start: CellPos): CellPos[] {
		const startTile = field.getTile(start.x, start.y);
		if (!startTile || !startTile.isSpecial) return [];

		const queue: CellPos[] = [start];
		const processed = new Set<string>();
		const burn = new Set<string>();

		while (queue.length) {
			const p = queue.shift()!;
			const key = `${p.x},${p.y}`;
			if (processed.has(key)) continue;
			processed.add(key);

			const t = field.getTile(p.x, p.y);
			if (!t || !t.isSpecial) continue;

			const behavior = this.registry.get(t.special);
			const area = behavior.getAffectedCells(field, p);

			for (const c of area) {
				burn.add(`${c.x},${c.y}`);
				const tt = field.getTile(c.x, c.y);
				if (tt?.isSpecial) queue.push(c);
			}
		}

		const result: CellPos[] = [];
		burn.forEach((k) => {
			const [sx, sy] = k.split(',').map(Number);
			result.push({ x: sx, y: sy });
		});
		return result;
	}
}
