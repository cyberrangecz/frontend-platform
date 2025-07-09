import {Agenda} from '@sentinel/layout';
import {AgendaMenuItem} from './agenda-menu-item';

export class AgendaPortalLink extends Agenda {
    disabled: boolean;
    description: string;
    icon: string;
    menu?: AgendaMenuItem[];

    constructor(
        name: string,
        disabled: boolean,
        route: string,
        description: string,
        icon: string,
        menu?: AgendaMenuItem[],
    ) {
        super(name, route);
        this.disabled = disabled;
        this.description = description;
        this.icon = icon;
        this.menu = menu;
    }
}
