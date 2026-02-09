import TileModel, { TileSpecial, TileColor } from '../domain/board/TileModel';

const { ccclass, property } = cc._decorator;

@ccclass
export default class TileView extends cc.Component {
	@property([cc.SpriteFrame])
	colorSprites: cc.SpriteFrame[] = [];

	// ✅ спец-иконки (задашь в инспекторе)
	@property(cc.SpriteFrame)
	specialBomb: cc.SpriteFrame = null; // block_bomb

	@property(cc.SpriteFrame)
	specialRocketH: cc.SpriteFrame = null; // block_rockets_horizontal

	@property(cc.SpriteFrame)
	specialRocketV: cc.SpriteFrame = null; // block_rocket_vertical

	model: TileModel = null;
	tileId: number = -1;
	private sprite: cc.Sprite = null;

	onLoad() {
		this.sprite = this.getComponent(cc.Sprite);
		this.updateView();
	}

	init(model: TileModel) {
		this.model = model;
		this.tileId = model?.id ?? -1;
		this.updateView();
	}

	private updateView() {
		if (!this.model || !this.sprite) return;

		// ✅ спецтайл рисуем спец-иконкой
		if (this.model.isSpecial) {
			switch (this.model.special) {
				case TileSpecial.Bomb:
					if (this.specialBomb) this.sprite.spriteFrame = this.specialBomb;
					return;

				case TileSpecial.RocketH:
					if (this.specialRocketH)
						this.sprite.spriteFrame = this.specialRocketH;
					return;

				case TileSpecial.RocketV:
					if (this.specialRocketV)
						this.sprite.spriteFrame = this.specialRocketV;
					return;

				default:
					break;
			}
		}

		// обычный тайл — по цвету
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
