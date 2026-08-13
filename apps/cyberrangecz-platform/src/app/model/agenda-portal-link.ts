import { Agenda } from '@sentinel/layout';
import { AgendaMenuItem } from './agenda-menu-item';
import { ValidPath } from '@crczp/routing-commons';

export class AgendaPortalLink extends Agenda {
    description: string;
    icon: string;
    menu?: AgendaMenuItem[];

    declare path: ValidPath;

    constructor(
        name: string,
        route: ValidPath,
        description: string,
        icon: string,
        menu?: AgendaMenuItem[],
    ) {
        super(name, route);
        this.path = route;
        this.description = description;
        this.icon = icon;
        this.menu = menu;
    }
}
