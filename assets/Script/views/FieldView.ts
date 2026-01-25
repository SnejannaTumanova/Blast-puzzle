import TileView from './TileView';
import TileModel, { TileColor } from '../models/TileModel';
const { ccclass, property } = cc._decorator;

@ccclass
export default class FieldView extends cc.Component {
	@property(cc.Prefab)
	tilePrefab: cc.Prefab = null;

	@property
	rows: number = 8;

	@property
	columns: number = 8;

	@property
	tileSize: number = 80;

	@property
	gap: number = 10;

	start() {
		cc.log('FieldView start NEW CODE', Date.now());
		this.generateGrid();
	}

	generateGrid() {
		this.node.removeAllChildren();

		const step = this.tileSize + this.gap;
		const totalW = this.columns * step;
		const totalH = this.rows * step;

		const startX = -totalW / 2 + step / 2;
		const startY = totalH / 2 - step / 2;

		const colors: TileColor[] = [
			TileColor.Blue,
			TileColor.Green,
			TileColor.Red,
			TileColor.Yellow,
			TileColor.Purple,
		];

		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.columns; col++) {
				const tile = cc.instantiate(this.tilePrefab);
				tile.parent = this.node;

				tile.width = this.tileSize;
				tile.height = this.tileSize;

				const randomColor = colors[Math.floor(Math.random() * colors.length)];
				const model = new TileModel(randomColor);

				const tileView = tile.getComponent(TileView);
				if (!tileView) {
					cc.error(
						'TileView component is missing on Tile prefab root (Tile node).'
					);
					continue;
				}
				tileView.init(model);

				const x = startX + col * step;
				const y = startY - row * step;
				tile.setPosition(x, y);
			}
		}
	}
}
