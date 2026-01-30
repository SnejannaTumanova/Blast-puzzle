const SWAP_KEY = 'boosters_swap_left';
const BOMB_KEY = 'boosters_bomb_left';

export type BoostersState = {
	swapLeft: number;
	bombLeft: number;
};

function clampNonNegative(v: number, fallback: number) {
	if (!Number.isFinite(v)) return fallback;
	return Math.max(0, v);
}

export function getBoostersState(defaults: BoostersState): BoostersState {
	const swapRaw = cc.sys.localStorage.getItem(SWAP_KEY);
	const bombRaw = cc.sys.localStorage.getItem(BOMB_KEY);

	const swapParsed = swapRaw ? parseInt(swapRaw, 10) : defaults.swapLeft;
	const bombParsed = bombRaw ? parseInt(bombRaw, 10) : defaults.bombLeft;

	return {
		swapLeft: clampNonNegative(swapParsed, defaults.swapLeft),
		bombLeft: clampNonNegative(bombParsed, defaults.bombLeft),
	};
}

export function setBoostersState(state: BoostersState) {
	cc.sys.localStorage.setItem(
		SWAP_KEY,
		String(clampNonNegative(state.swapLeft, 0))
	);
	cc.sys.localStorage.setItem(
		BOMB_KEY,
		String(clampNonNegative(state.bombLeft, 0))
	);
}

export function resetBoostersState(defaults: BoostersState) {
	setBoostersState(defaults);
}
