export default class GameStateModel {
	movesLeft: number;
	score: number;
	targetScore: number;

	constructor(moves: number, targetScore: number) {
		this.movesLeft = moves;
		this.score = 0;
		this.targetScore = targetScore;
	}

	isWin(): boolean {
		return this.score >= this.targetScore;
	}

	isLose(): boolean {
		return this.movesLeft <= 0 && !this.isWin();
	}
}
