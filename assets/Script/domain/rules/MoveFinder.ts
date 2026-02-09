import FieldModel from '../board/FieldModel';
import MatchFinder from './MatchFinder';
import { CellPos } from '../board/CellPos';

export default class MoveFinder {
	constructor(private matchFinder: MatchFinder) {}

	hasAnyMove(field: FieldModel, minGroupSize = 2): boolean {
		// спецтайл = гарантированный ход
		for (let y = 0; y < field.height; y++) {
			for (let x = 0; x < field.width; x++) {
				const t = field.getTile(x, y);
				if (t?.isSpecial) return true;
			}
		}

		if (minGroupSize <= 1) return true;

		// быстрый кейс для 2: пара соседей одинакового цвета
		if (minGroupSize === 2) {
			for (let y = 0; y < field.height; y++) {
				for (let x = 0; x < field.width; x++) {
					const t = field.getTile(x, y);
					if (!t || t.isSpecial) continue;
					const c = t.color;

					const r = field.getTile(x + 1, y);
					if (r && !r.isSpecial && r.color === c) return true;

					const d = field.getTile(x, y + 1);
					if (d && !d.isSpecial && d.color === c) return true;
				}
			}
			return false;
		}

		// общий кейс через MatchFinder
		for (let y = 0; y < field.height; y++) {
			for (let x = 0; x < field.width; x++) {
				const g = this.matchFinder.getBurnGroup(field, { x, y }, minGroupSize);
				if (g.length > 0) return true;
			}
		}
		return false;
	}
}
