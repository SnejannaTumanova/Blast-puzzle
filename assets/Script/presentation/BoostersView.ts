import { BoosterKind } from '../features/boosters/BoosterKind';

const { ccclass, property } = cc._decorator;

const TAG_PULSE = 1001;
const TAG_PRESS = 1002;

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

	@property(cc.Node)
	swapSelected: cc.Node = null;

	@property(cc.Node)
	bombSelected: cc.Node = null;

	onSwapClick: (() => void) | null = null;
	onBombClick: (() => void) | null = null;

	private active: BoosterKind = 'none';
	private swapEnabled = true;
	private bombEnabled = true;

	onEnable() {
		this.swapButton?.on(cc.Node.EventType.TOUCH_END, this.handleSwap, this);
		this.bombButton?.on(cc.Node.EventType.TOUCH_END, this.handleBomb, this);

		// стартовое состояние
		this.setActiveBooster('none');
	}

	onDisable() {
		this.swapButton?.off(cc.Node.EventType.TOUCH_END, this.handleSwap, this);
		this.bombButton?.off(cc.Node.EventType.TOUCH_END, this.handleBomb, this);
	}

	// ===== counts / enable =====

	setSwapCount(v: number) {
		if (this.swapCountLabel) this.swapCountLabel.string = String(v);

		this.swapEnabled = v > 0;
		this.applyDisabledVisual(this.swapButton, this.swapEnabled);

		// если закончился активный — снять
		if (v <= 0 && this.active === 'swap') {
			this.setActiveBooster('none');
			return;
		}

		// если не снимали — синхронизируем пульс
		this.applyPulseVisual(this.swapButton, this.active === 'swap');
	}

	setBombCount(v: number) {
		if (this.bombCountLabel) this.bombCountLabel.string = String(v);

		this.bombEnabled = v > 0;
		this.applyDisabledVisual(this.bombButton, this.bombEnabled);

		if (v <= 0 && this.active === 'bomb') {
			this.setActiveBooster('none');
			return;
		}

		this.applyPulseVisual(this.bombButton, this.active === 'bomb');
	}

	// ===== active state =====

	setActiveBooster(kind: BoosterKind) {
		this.active = kind;

		if (this.swapSelected) this.swapSelected.active = kind === 'swap';
		if (this.bombSelected) this.bombSelected.active = kind === 'bomb';

		// ВАЖНО: при отмене гарантированно возвращаем scale=1 и убираем анимации
		this.syncButtonVisual(this.swapButton, kind === 'swap', this.swapEnabled);
		this.syncButtonVisual(this.bombButton, kind === 'bomb', this.bombEnabled);
	}

	private syncButtonVisual(
		node: cc.Node,
		shouldBeActive: boolean,
		enabled: boolean,
	) {
		if (!node || !node.isValid) return;

		// убираем ВСЕ текущие анимации, чтобы ничего не "залипало"
		this.stopActionByTagSafe(node, TAG_PRESS);
		this.stopActionByTagSafe(node, TAG_PULSE);

		// базовый scale всегда 1 (если отключено или не активно)
		node.scale = 1;

		// пульс только если активно И доступно
		if (enabled && shouldBeActive) {
			this.applyPulseVisual(node, true);
		}
	}

	// ===== visuals =====

	private applyDisabledVisual(node: cc.Node, enabled: boolean) {
		if (!node || !node.isValid) return;

		node.opacity = enabled ? 255 : 120;

		// если отключили — убираем пульс и возвращаем размер
		if (!enabled) {
			this.stopActionByTagSafe(node, TAG_PULSE);
			this.stopActionByTagSafe(node, TAG_PRESS);
			node.scale = 1;
		}
	}

	private applyPulseVisual(node: cc.Node, isActive: boolean) {
		if (!node || !node.isValid) return;

		// всегда стопаем предыдущий пульс, чтобы не наслаивался
		this.stopActionByTagSafe(node, TAG_PULSE);

		if (!isActive) {
			// если не активен — нормальный scale
			node.scale = 1;
			return;
		}

		node.scale = 1.06;

		const pulse = cc.repeatForever(
			cc.sequence(cc.scaleTo(0.35, 1.06), cc.scaleTo(0.35, 1.03)),
		);

		// @ts-ignore
		pulse.setTag && pulse.setTag(TAG_PULSE);
		node.runAction(pulse);
	}

	// ===== input =====

	private handleSwap() {
		if (!this.swapEnabled) return;

		this.pressAnim(this.swapButton, 'swap');
		this.onSwapClick?.();
	}

	private handleBomb() {
		if (!this.bombEnabled) return;

		this.pressAnim(this.bombButton, 'bomb');
		this.onBombClick?.();
	}

	private pressAnim(node: cc.Node, kind: BoosterKind) {
		if (!node || !node.isValid) return;

		// стопаем только прошлый press, пульс пусть живёт
		this.stopActionByTagSafe(node, TAG_PRESS);

		// ❗ ВАЖНО: press должен возвращаться в правильный "базовый" scale:
		// если этот бустер сейчас активен (после клика toggle может выключиться),
		// поэтому ориентируемся на ТЕКУЩЕЕ this.active на момент нажатия:
		// - если active === kind и enabled => базовый 1.06
		// - иначе базовый 1
		const base =
			(kind === 'swap' && this.active === 'swap' && this.swapEnabled) ||
			(kind === 'bomb' && this.active === 'bomb' && this.bombEnabled)
				? 1.06
				: 1.0;

		// нажатие: чуть уменьшаем от текущего base и возвращаемся в base
		const press = cc.sequence(
			cc.scaleTo(0.06, base * 0.94),
			cc.scaleTo(0.08, base),
		);

		// @ts-ignore
		press.setTag && press.setTag(TAG_PRESS);
		node.runAction(press);

		// если base == 1.06, то пульс уже может быть запущен и продолжит работать
		// если base == 1, то кнопка не должна "залипать" увеличенной
	}

	private stopActionByTagSafe(node: cc.Node, tag: number) {
		// @ts-ignore
		if (node.stopActionByTag) {
			// @ts-ignore
			node.stopActionByTag(tag);
		} else {
			// запасной вариант: стопаем всё (на старых билдах)
			node.stopAllActions();
		}
	}
}
