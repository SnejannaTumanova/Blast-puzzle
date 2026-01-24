const { ccclass, property } = cc._decorator;
import TileModel from '../models/TileModel';

@ccclass
export default class TileView extends cc.Component {
	model: TileModel = null;

	init(model: TileModel) {
		this.model = model;
		// TODO: обновить визуал по цвету
	}
}
