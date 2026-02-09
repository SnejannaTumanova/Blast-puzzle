import FieldModel from '../board/FieldModel';
import { CellPos } from '../board/CellPos';

export default class MatchFinder {
	findGroup(field: FieldModel, start: CellPos): CellPos[] {
		const startTile = field.getTile(start.x, start.y);
		if (!startTile) return [];
		if (startTile.isSpecial) return [];

		const color = startTile.color;
		const stack: CellPos[] = [start];
		const visited = new Set<string>([`${start.x},${start.y}`]);
		const result: CellPos[] = [];

		const tryPush = (x: number, y: number) => {
			const key = `${x},${y}`;
			if (visited.has(key)) return;
			const t = field.getTile(x, y);
			if (!t || t.isSpecial || t.color !== color) return;
			visited.add(key);
			stack.push({ x, y });
		};

		while (stack.length) {
			const p = stack.pop()!;
			result.push(p);
			tryPush(p.x + 1, p.y);
			tryPush(p.x - 1, p.y);
			tryPush(p.x, p.y + 1);
			tryPush(p.x, p.y - 1);
		}

		return result;
	}

	getBurnGroup(field: FieldModel, start: CellPos, minGroupSize = 2): CellPos[] {
		const g = this.findGroup(field, start);
		return g.length >= minGroupSize ? g : [];
	}
}
