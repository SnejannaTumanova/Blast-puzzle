const { ccclass, property } = cc._decorator;
import TileView from './TileView';
import TileModel from '../models/TileModel';

@ccclass
export default class FieldView extends cc.Component {
	createTile(model: TileModel, x: number, y: number): TileView {
		const node = new cc.Node('Tile');
		const tileView = node.addComponent(TileView);
		tileView.init(model);
		node.setPosition(x * 50, y * 50); // пример позиции
		this.node.addChild(node);
		return tileView;
	}
}
