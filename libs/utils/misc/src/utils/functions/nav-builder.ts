import * as layout from '@sentinel/layout';
import { AgendaContainer } from '@sentinel/layout';

export type NavAgendaContainerConfig = {
    label: string;
    agendas: (NavAgendaContainerConfig | NavAgendaConfig)[];
};

export type NavAgendaConfig = layout.Agenda & {
    canActivate?: () => boolean;
};

export function buildNav(
    navContainers: NavAgendaContainerConfig[]
): AgendaContainer[] {
    const elements: AgendaContainer[] = [];
    navContainers.forEach((containerConfig) => {
        appendTopLevelContainer(elements, containerConfig);
    });
    return elements;
}

function appendAgenda(
    elements: layout.MenuElement[],
    agendaConfig: NavAgendaConfig
): layout.MenuElement[] {
    if (!agendaConfig.canActivate || agendaConfig.canActivate()) {
        elements.push(new layout.Agenda(agendaConfig.label, agendaConfig.path));
    }
    return elements;
}

function appendTopLevelContainer(
    elements: layout.AgendaContainer[],
    containerConfig: NavAgendaContainerConfig
): layout.AgendaContainer[] {
    return appendContainer(
        elements,
        containerConfig
    ) as layout.AgendaContainer[];
}

function appendContainer(
    elements: layout.MenuElement[],
    containerConfig: NavAgendaContainerConfig
): layout.MenuElement[] {
    const container = new layout.AgendaContainer(containerConfig.label, []);
    containerConfig.agendas.forEach((agendaConfig) => {
        if ('agendas' in agendaConfig) {
            appendContainer(container.children, agendaConfig);
        } else {
            appendAgenda(container.children, agendaConfig);
        }
    });
    if (container.children.length > 0) {
        elements.push(container);
    }
    return elements;
}

export const NavBuilder = {
    buildNav,
};
