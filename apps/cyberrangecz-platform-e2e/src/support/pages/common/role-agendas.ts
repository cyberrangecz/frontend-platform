import type { AccountRole } from '../../accounts';

export type AgendaKey =
    | 'trainingRun'
    | 'trainingDefinition'
    | 'trainingInstance'
    | 'sandboxDefinition'
    | 'pool'
    | 'images'
    | 'groups'
    | 'users'
    | 'microservices';

export type HomeCategory = 'Participate' | 'Design' | 'Organize' | 'Manage';
export type NavigationGroup = 'Trainings' | 'Sandboxes' | 'Administration';

/** How one agenda appears on the home page, in the side navigation and on its own page. */
export interface Agenda {
    homeLabel: string;
    homeCategory: HomeCategory;
    navigationLabel: string;
    navigationGroup: NavigationGroup;
    path: string;
    pageTitle: string;
    breadcrumbLabel: string;
}

export const AGENDAS: Record<AgendaKey, Agenda> = {
    trainingRun: {
        homeLabel: 'Training Run',
        homeCategory: 'Participate',
        navigationLabel: 'Run',
        navigationGroup: 'Trainings',
        path: '/run',
        pageTitle: 'Training Run Overview',
        breadcrumbLabel: 'Training Runs',
    },
    trainingDefinition: {
        homeLabel: 'Training Definition',
        homeCategory: 'Design',
        navigationLabel: 'Definition',
        navigationGroup: 'Trainings',
        path: '/linear-definition',
        pageTitle: 'Training Definition Overview',
        breadcrumbLabel: 'Training Definitions',
    },
    trainingInstance: {
        homeLabel: 'Training Instance',
        homeCategory: 'Organize',
        navigationLabel: 'Instance',
        navigationGroup: 'Trainings',
        path: '/linear-instance',
        pageTitle: 'Training Instance Overview',
        breadcrumbLabel: 'Training Instances',
    },
    sandboxDefinition: {
        homeLabel: 'Sandbox Definition',
        homeCategory: 'Design',
        navigationLabel: 'Definition',
        navigationGroup: 'Sandboxes',
        path: '/sandbox-definition',
        pageTitle: 'Sandbox Definition Overview',
        breadcrumbLabel: 'Sandbox Definitions',
    },
    pool: {
        homeLabel: 'Pool',
        homeCategory: 'Organize',
        navigationLabel: 'Pool',
        navigationGroup: 'Sandboxes',
        path: '/pool',
        pageTitle: 'Pool Overview',
        breadcrumbLabel: 'Pools',
    },
    images: {
        homeLabel: 'Images',
        homeCategory: 'Organize',
        navigationLabel: 'Images',
        navigationGroup: 'Sandboxes',
        path: '/sandbox-image',
        pageTitle: 'Images Overview',
        breadcrumbLabel: 'Images',
    },
    groups: {
        homeLabel: 'Groups',
        homeCategory: 'Manage',
        navigationLabel: 'Group',
        navigationGroup: 'Administration',
        path: '/group',
        pageTitle: 'Group Overview',
        breadcrumbLabel: 'Groups',
    },
    users: {
        homeLabel: 'Users',
        homeCategory: 'Manage',
        navigationLabel: 'User',
        navigationGroup: 'Administration',
        path: '/user',
        pageTitle: 'User Overview',
        breadcrumbLabel: 'Users',
    },
    microservices: {
        homeLabel: 'Microservices',
        homeCategory: 'Manage',
        navigationLabel: 'Microservice',
        navigationGroup: 'Administration',
        path: '/microservice',
        pageTitle: 'Microservice Overview',
        breadcrumbLabel: 'Microservice',
    },
};

export const ALL_AGENDAS: readonly AgendaKey[] = Object.keys(AGENDAS) as AgendaKey[];

/** Agendas each role can open. Every account holds the training trainee role through DEFAULT-GROUP. */
export const AGENDAS_OF_ROLE: Record<AccountRole, readonly AgendaKey[]> = {
    trainingDesigner: ['trainingRun', 'trainingDefinition'],
    trainingOrganizer: ['trainingRun', 'pool', 'images', 'trainingInstance'],
    sandboxDesigner: ['trainingRun', 'sandboxDefinition'],
    sandboxOrganizer: ['trainingRun', 'pool', 'images'],
    userAdministrator: ['trainingRun', 'groups', 'users', 'microservices'],
    trainee: ['trainingRun'],
};

/** Roles that reach more than one agenda and therefore stay on the home page. */
export const MULTI_AGENDA_ROLES = (Object.keys(AGENDAS_OF_ROLE) as AccountRole[]).filter(
    (role) => AGENDAS_OF_ROLE[role].length > 1,
);

export const ALL_ROLES = Object.keys(AGENDAS_OF_ROLE) as AccountRole[];

/** Whether the backends refuse the agenda's requests from the local origin, so its checks run on the deployed origin only. */
export function isDeployedOriginAgenda(agenda: Agenda): boolean {
    return agenda === AGENDAS.microservices;
}

export function agendasOf(role: AccountRole): Agenda[] {
    return AGENDAS_OF_ROLE[role].map((key) => AGENDAS[key]);
}

/** Display name the platform prints for a seed account, derived from its login `user-N`. */
export function displayNameOf(login: string): string {
    return `User${login.replace('user-', '')} Generated`;
}
