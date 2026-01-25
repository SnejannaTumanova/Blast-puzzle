const { ccclass, property } = cc._decorator;
import TileModel, { TileColor } from '../models/TileModel';

@ccclass
export default class TileView extends cc.Component {
	@property([cc.SpriteFrame])
	colorSprites: cc.SpriteFrame[] = [];

	private sprite: cc.Sprite = null;
	model: TileModel = null;

	onLoad() {
		this.sprite = this.getComponent(cc.Sprite);
	}

	init(model: TileModel) {
		this.model = model;
		this.updateView();
	}

	updateView() {
		if (!this.model || !this.sprite) return;

		const map: Record<TileColor, number> = {
			[TileColor.Blue]: 0,
			[TileColor.Green]: 1,
			[TileColor.Red]: 2,
			[TileColor.Yellow]: 3,
			[TileColor.Purple]: 4,
		};

		const idx = map[this.model.color];
		const frame = this.colorSprites[idx];
		if (frame) this.sprite.spriteFrame = frame;
	}
}
