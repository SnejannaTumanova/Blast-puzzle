const { ccclass, property } = cc._decorator;

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

	onRestart: (() => void) | null = null;

	onLoad() {
		// Оверлей по умолчанию скрыт
		this.node.active = false;

		// Автопоиск (если не проставили в инспекторе)
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
	}

	show(title: string, body: string) {
		if (this.titleLabel) this.titleLabel.string = title;
		if (this.bodyLabel) this.bodyLabel.string = body;

		this.node.active = true;

		// Гарантируем порядок отрисовки внутри оверлея
		if (this.dim) this.dim.setSiblingIndex(0);
		if (this.panel) this.panel.setSiblingIndex(this.node.childrenCount - 1);

		// Не завышаем zIndex: достаточно небольших значений
		if (this.dim) this.dim.zIndex = 0;
		if (this.panel) this.panel.zIndex = 10;
		if (this.restartButton) this.restartButton.node.zIndex = 20;
	}

	hide() {
		this.node.active = false;
	}

	onEnable() {
		// Подписываемся на "click" только когда оверлей активен
		const btnNode = this.restartButton?.node;
		if (btnNode && cc.isValid(btnNode)) {
			btnNode.on('click', this.handleRestart, this);
		}
	}

	onDisable() {
		// Снимаем подписку
		const btnNode = this.restartButton?.node;
		if (btnNode && cc.isValid(btnNode)) {
			btnNode.off('click', this.handleRestart, this);
		}
	}

	private handleRestart() {
		this.onRestart?.();
	}
}
