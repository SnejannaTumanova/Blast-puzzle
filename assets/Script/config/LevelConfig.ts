export type LevelConfig = {
	moves: number;
	targetScore: number;
};

export const LEVELS: LevelConfig[] = [
	{ moves: 37, targetScore: 500 },
	{ moves: 30, targetScore: 650 },
	{ moves: 28, targetScore: 800 },
	{ moves: 20, targetScore: 950 },
	{ moves: 20, targetScore: 1100 },
];
