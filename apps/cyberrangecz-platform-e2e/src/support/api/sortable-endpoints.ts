import type { AccountRole } from '../accounts';
import type { SharedFixture } from '../shared-fixture';
import type { Query } from './api-client';

/** How a backend reads the sort of a paginated list. */
export type SortFormat = 'java' | 'django';

/** Ids a list path may be scoped to. */
export interface SortableScope {
    shared: SharedFixture;
    groupId: number;
}

/** One paginated list the frontend renders as a sortable table. */
export interface SortableEndpoint {
    name: string;
    service: 'training' | 'sandbox' | 'userAndGroup';
    format: SortFormat;
    /** Account that may read the list. */
    role: AccountRole;
    path: (scope: SortableScope) => string;
    /** Query parameters the list requires besides pagination and sort. */
    filters?: Query;
}

/** Sort field no backend lists as sortable. */
export const UNKNOWN_SORT_FIELD = 'unknown_field_e2e';

/** Query that asks the first small page of a list in the wire format of its backend. */
export function firstPageQuery({ format, filters }: SortableEndpoint): Query {
    return {
        ...(format === 'java' ? { page: 0, size: 5 } : { page: 1, page_size: 5 }),
        ...filters,
    };
}

/** Query that asks the first small page of a list sorted by the unknown field. */
export function unknownSortQuery(endpoint: SortableEndpoint): Query {
    return {
        ...firstPageQuery(endpoint),
        ...(endpoint.format === 'java'
            ? { sort: `${UNKNOWN_SORT_FIELD},asc` }
            : { sort_by: UNKNOWN_SORT_FIELD, order: 'asc' }),
    };
}

const training = (name: string, role: AccountRole, path: SortableEndpoint['path']): SortableEndpoint => ({
    name,
    service: 'training',
    format: 'java',
    role,
    path,
});

const sandbox = (name: string, role: AccountRole, path: SortableEndpoint['path']): SortableEndpoint => ({
    name,
    service: 'sandbox',
    format: 'django',
    role,
    path,
});

const userAndGroup = (name: string, path: SortableEndpoint['path']): SortableEndpoint => ({
    name,
    service: 'userAndGroup',
    format: 'java',
    role: 'userAdministrator',
    path,
});

/** Every list endpoint behind a sortable table of the application; a new table is one line. */
export const SORTABLE_ENDPOINTS: readonly SortableEndpoint[] = [
    training('training definitions', 'trainingDesigner', () => '/training-definitions'),
    {
        ...training(
            'training definitions for organizers',
            'trainingOrganizer',
            () => '/training-definitions/for-organizers',
        ),
        filters: { state: 'RELEASED' },
    },
    training('training instances', 'trainingOrganizer', () => '/training-instances'),
    training(
        'training runs of an instance',
        'trainingOrganizer',
        ({ shared }) => `/training-instances/${shared.trainingInstance.id}/training-runs`,
    ),
    training('accessible training runs', 'trainee', () => '/training-runs/accessible'),
    training(
        'cheating detections of an instance',
        'trainingOrganizer',
        ({ shared }) => `/cheating-detections/${shared.trainingInstance.id}/detections`,
    ),
    training(
        'designers outside a training definition',
        'trainingDesigner',
        ({ shared }) => `/training-definitions/${shared.trainingDefinition.id}/designers-not-in-training-definition`,
    ),
    training(
        'authors of a training definition',
        'trainingDesigner',
        ({ shared }) => `/training-definitions/${shared.trainingDefinition.id}/authors`,
    ),
    training(
        'organizers of a training instance',
        'trainingOrganizer',
        ({ shared }) => `/training-instances/${shared.trainingInstance.id}/organizers`,
    ),
    training(
        'organizers outside a training instance',
        'trainingOrganizer',
        ({ shared }) => `/training-instances/${shared.trainingInstance.id}/organizers-not-in-training-instance`,
    ),

    sandbox('sandbox definitions', 'sandboxDesigner', () => '/definitions'),
    sandbox(
        'sandbox definition revisions',
        'sandboxDesigner',
        ({ shared }) => `/definitions/${shared.sandboxDefinition.id}/refs`,
    ),
    sandbox('sandbox images', 'sandboxDesigner', () => '/images'),
    sandbox('pools', 'sandboxOrganizer', () => '/pools'),
    sandbox('sandboxes of a pool', 'sandboxOrganizer', ({ shared }) => `/pools/${shared.pool.id}/sandboxes`),
    sandbox(
        'allocation units of a pool',
        'sandboxOrganizer',
        ({ shared }) => `/pools/${shared.pool.id}/sandbox-allocation-units`,
    ),
    sandbox(
        'allocation requests of a pool',
        'sandboxOrganizer',
        ({ shared }) => `/pools/${shared.pool.id}/allocation-requests`,
    ),
    sandbox(
        'cleanup requests of a pool',
        'sandboxOrganizer',
        ({ shared }) => `/pools/${shared.pool.id}/cleanup-requests`,
    ),

    userAndGroup('users', () => '/users'),
    userAndGroup('users outside a group', ({ groupId }) => `/users/not-in-group/${groupId}`),
    userAndGroup('groups', () => '/groups'),
    userAndGroup('roles of a group', ({ groupId }) => `/groups/${groupId}/roles`),
    userAndGroup('roles', () => '/roles'),
    userAndGroup('roles outside a group', ({ groupId }) => `/roles/not-in-group/${groupId}`),
    userAndGroup('microservices', () => '/microservices'),
];
