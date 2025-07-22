import {Agenda} from '@sentinel/layout';
import {AgendaMenuItem} from './agenda-menu-item';
import {ValidPath} from "@crczp/common";

export class AgendaPortalLink extends Agenda {
    disabled: boolean;
    description: string;
    icon: string;
    menu?: AgendaMenuItem[];

    declare path: ValidPath;

    constructor(
        name: string,
        disabled: boolean,
        route: ValidPath,
        description: string,
        icon: string,
        menu?: AgendaMenuItem[],
    ) {
        super(name, route);
        this.path = route;
        this.disabled = disabled;
        this.description = description;
        this.icon = icon;
        this.menu = menu;
    }
}
