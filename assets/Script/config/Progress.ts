const LEVEL_KEY = 'current_level';

export function getLevelIndex(): number {
	const raw = cc.sys.localStorage.getItem(LEVEL_KEY);
	const idx = raw ? parseInt(raw, 10) : 0;
	return isNaN(idx) ? 0 : idx;
}

export function setLevelIndex(i: number) {
	cc.sys.localStorage.setItem(LEVEL_KEY, String(i));
}
