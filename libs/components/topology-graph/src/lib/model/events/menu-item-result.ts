import { NodeActionEnum } from '../enums/node-context-menu-items-enum';

export class MenuItemResult {
    type: NodeActionEnum;
    payload: any;

    constructor(type: NodeActionEnum, payload: any) {
        this.type = type;
        this.payload = payload;
    }
}
