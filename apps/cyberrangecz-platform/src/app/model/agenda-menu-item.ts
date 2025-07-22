import {ValidPath} from "@crczp/common";

export class AgendaMenuItem {
    icon: string;
    label: string;
    path: ValidPath;

    constructor(icon: string, label: string, path: ValidPath) {
        this.icon = icon;
        this.label = label;
        this.path = path;
    }
}
