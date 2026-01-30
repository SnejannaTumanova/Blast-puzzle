const { ccclass, property } = cc._decorator;

export type ResultType = 'win' | 'lose';

type ShowArgs = {
	type: ResultType;
	title: string;
	body: string;
	canNext: boolean;
	nextText?: string;
};

@ccclass
export default class ResultOverlayView extends cc.Component {
	@property(cc.Node)
	dim: cc.Node = null;

	@property(cc.Node)
	panel: cc.Node = null;

	@property(cc.Label)
	titleLabel: cc.Label = null;

	@property(cc.Label)
	bodyLabel: cc.Label = null;

	@property(cc.Button)
	restartButton: cc.Button = null;

	@property(cc.Button)
	nextButton: cc.Button = null;

	onRestart: (() => void) | null = null;
	onNext: (() => void) | null = null;

	private lastType: ResultType = 'lose';
	private canNext: boolean = false;

	onLoad() {
		this.node.active = false;

		// автопоиск (если не проставили в инспекторе)
		if (!this.titleLabel) {
			this.titleLabel =
				cc.find('Panel/TitleLabel', this.node)?.getComponent(cc.Label) || null;
		}
		if (!this.bodyLabel) {
			this.bodyLabel =
				cc.find('Panel/BodyLabel', this.node)?.getComponent(cc.Label) || null;
		}
		if (!this.restartButton) {
			this.restartButton =
				cc.find('Panel/RestartButton', this.node)?.getComponent(cc.Button) ||
				null;
		}
		if (!this.nextButton) {
			this.nextButton =
				cc.find('Panel/NextButton', this.node)?.getComponent(cc.Button) || null;
		}
	}

	show(args: ShowArgs) {
		this.lastType = args.type;
		this.canNext = args.canNext;

		if (this.titleLabel) this.titleLabel.string = args.title;
		if (this.bodyLabel) this.bodyLabel.string = args.body;

		this.node.active = true;

		// порядок слоёв
		if (this.dim) this.dim.setSiblingIndex(0);
		if (this.panel) this.panel.setSiblingIndex(this.node.childrenCount - 1);

		if (this.dim) this.dim.zIndex = 0;
		if (this.panel) this.panel.zIndex = 10;

		if (this.restartButton) this.restartButton.node.zIndex = 20;
		if (this.nextButton) this.nextButton.node.zIndex = 20;

		// ✅ Next показываем только если разрешено
		if (this.nextButton) {
			this.nextButton.node.active = this.canNext;
			this.nextButton.interactable = this.canNext;

			// ✅ обновляем текст на кнопке
			const label = this.nextButton.getComponentInChildren(cc.Label);
			if (label && args.nextText) {
				label.string = args.nextText;
			}
		}
	}

	hide() {
		this.node.active = false;
	}

	onEnable() {
		if (this.restartButton?.node && cc.isValid(this.restartButton.node)) {
			this.restartButton.node.on('click', this.handleRestart, this);
		}
		if (this.nextButton?.node && cc.isValid(this.nextButton.node)) {
			this.nextButton.node.on('click', this.handleNext, this);
		}
	}

	onDisable() {
		if (this.restartButton?.node && cc.isValid(this.restartButton.node)) {
			this.restartButton.node.off('click', this.handleRestart, this);
		}
		if (this.nextButton?.node && cc.isValid(this.nextButton.node)) {
			this.nextButton.node.off('click', this.handleNext, this);
		}
	}

	private handleRestart() {
		this.onRestart?.();
	}

	private handleNext() {
		if (this.lastType !== 'win') return;
		if (!this.canNext) return;
		this.onNext?.();
	}
}
