import * as layout from '@sentinel/layout';
import { AgendaContainer } from '@sentinel/layout';

export type NavAgendaContainerConfig = {
    label: string;
    agendas: (NavAgendaContainerConfig | NavAgendaConfig)[];
};

export type NavAgendaConfig = layout.Agenda & {
    canActivate?: () => boolean;
};

export class NavBuilder {
    public static buildNav(
        navContainers: NavAgendaContainerConfig[]
    ): AgendaContainer[] {
        const elements: AgendaContainer[] = [];
        navContainers.forEach((containerConfig) => {
            this.appendTopLevelContainer(elements, containerConfig);
        });
        return elements;
    }

    private static appendAgenda(
        elements: layout.MenuElement[],
        agendaConfig: NavAgendaConfig
    ): layout.MenuElement[] {
        if (!agendaConfig.canActivate || agendaConfig.canActivate()) {
            elements.push(
                new layout.Agenda(agendaConfig.label, agendaConfig.path)
            );
        }
        return elements;
    }

    private static appendTopLevelContainer(
        elements: layout.AgendaContainer[],
        containerConfig: NavAgendaContainerConfig
    ): layout.AgendaContainer[] {
        return this.appendContainer(
            elements,
            containerConfig
        ) as layout.AgendaContainer[];
    }

    private static appendContainer(
        elements: layout.MenuElement[],
        containerConfig: NavAgendaContainerConfig
    ): layout.MenuElement[] {
        const container = new layout.AgendaContainer(containerConfig.label, []);
        containerConfig.agendas.forEach((agendaConfig) => {
            if ('agendas' in agendaConfig) {
                this.appendContainer(container.children, agendaConfig);
            } else {
                this.appendAgenda(container.children, agendaConfig);
            }
        });
        if (container.children.length > 0) {
            elements.push(container);
        }
        return elements;
    }
}
