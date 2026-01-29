const { ccclass, property } = cc._decorator;

@ccclass
export default class BoostersView extends cc.Component {
	@property(cc.Node)
	swapButton: cc.Node = null;

	@property(cc.Label)
	swapCountLabel: cc.Label = null;

	@property(cc.Node)
	bombButton: cc.Node = null;

	@property(cc.Label)
	bombCountLabel: cc.Label = null;

	onSwapClick: (() => void) | null = null;
	onBombClick: (() => void) | null = null;

	onLoad() {
		if (this.swapButton)
			this.swapButton.on(
				cc.Node.EventType.TOUCH_END,
				() => this.onSwapClick && this.onSwapClick(),
				this
			);
		if (this.bombButton)
			this.bombButton.on(
				cc.Node.EventType.TOUCH_END,
				() => this.onBombClick && this.onBombClick(),
				this
			);
	}

	setSwapCount(v: number) {
		if (this.swapCountLabel) this.swapCountLabel.string = String(v);
	}

	setBombCount(v: number) {
		if (this.bombCountLabel) this.bombCountLabel.string = String(v);
	}
}
