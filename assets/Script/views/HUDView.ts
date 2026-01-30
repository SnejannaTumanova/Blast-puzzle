const { ccclass, property } = cc._decorator;

@ccclass
export default class HUDView extends cc.Component {
	@property(cc.Label)
	movesLabel: cc.Label = null;

	@property(cc.Label)
	scoreValueLabel: cc.Label = null; // "221/500"

	@property(cc.Label)
	levelLabel: cc.Label = null;

	setMoves(moves: number) {
		if (this.movesLabel) this.movesLabel.string = String(moves);
	}

	setScore(current: number, target: number) {
		if (this.scoreValueLabel)
			this.scoreValueLabel.string = `${current}/${target}`;
	}

	setLevel(n: number) {
		if (this.levelLabel) this.levelLabel.string = `LEVEL ${n}`;
	}
}
