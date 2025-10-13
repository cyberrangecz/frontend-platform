import { ValidPath } from '@crczp/routing-commons';

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
