import { NavigationBuilder, ValidPath } from './router-types';

/**
 * This object allows the routing structure to be strongly typed
 *
 * typeof ROUTES is used to derive 'NavigablePaths' and 'NavigablePathSuffixes', whereas the object itself
 * can be passed for runtime validation
 *
 * VAR_ prefix denotes path variable, such as /:instanceId
 * EXCL_ prefix denotes unroutable path
 */
export const DEFINED_ROUTES = {
    login: {},
    logout: {},
    home: {},
    notifications: {
        VAR_id: {},
    },

    ['adaptive-definition']: {
        create: {},
        simulator: {},
        VAR_definitionId: {
            edit: {},
            preview: {},
            detail: {},
            simulator: {},
        },
    },

    ['linear-definition']: {
        create: {},
        VAR_definitionId: {
            edit: {},
            preview: {},
            detail: {},
        },
    },

    ['adaptive-instance']: {
        create: {},
        VAR_instanceId: {
            edit: {},
            detail: {},
            progress: {},
            ['access-token']: {},
            runs: {},
            simulator: {},
            results: {},
        },
    },

    ['linear-instance']: {
        create: {},
        VAR_instanceId: {
            edit: {},
            detail: {},
            progress: {},
            ['access-token']: {},
            runs: {},
            simulator: {},
            results: {
                dashboard: {},
                ['quiz-results']: {},
                walkthrough: {},
                ['command-timeline']: {},
                ['command-analysis']: {},
            },
            ['aggregated-results']: {},
            ['cheating-detection']: {
                create: {},
                VAR_eventId: {
                    detail: {},
                },
            },
        },
    },

    run: {
        EXCL_adaptive: {
            EXCL_VAR_runToken: {
                access: {},
            },
            EXCL_VAR_runId: {
                resume: {},
                results: {},
            },
        },
        EXCL_linear: {
            EXCL_VAR_runToken: {
                access: {},
            },
            EXCL_VAR_runId: {
                resume: {},
                results: {
                    ['score-development']: {},
                    ['command-timeline']: {},
                    ['command-analysis']: {},
                },
            },
        },
    },

    ['mitre-techniques']: {},

    ['sandbox-image']: {},

    ['sandbox-definition']: {
        create: {},
        VAR_definitionId: {
            topology: {},
        },
    },

    pool: {
        create: {},
        VAR_poolId: {
            edit: {},
            ['EXCL_sandbox-instance']: {
                VAR_sandboxInstanceId: {
                    cleanup: {},
                    topology: {},
                },
            },
        },
    },

    user: {
        VAR_userId: {},
    },

    group: {
        create: {},
        VAR_groupId: {
            edit: {},
        },
    },

    microservice: {
        create: {},
    },
} as const;

type RoutesTree = { [key: string]: RoutesTree };

function handleExclVar(
    pathSegment: string
): [excl: boolean, variable: boolean] {
    const exclVar =
        pathSegment.startsWith('EXCL_VAR_') ||
        pathSegment.startsWith('VAR_EXCL_');
    if (exclVar) return [true, true];
    if (pathSegment.startsWith('EXCL_')) return [true, false];
    if (pathSegment.startsWith('VAR_')) return [false, true];
    return [false, false];
}

function generateValidRoutes(
    routes: RoutesTree,
    basePath = '',
    output: Record<string, true> = {}
): Record<string, true> {
    for (const key of Object.keys(routes)) {
        const [excl, variable] = handleExclVar(key);

        const part = key
            .replace(/^EXCL_/, '')
            .replace(/^VAR_/, '')
            .replace(/^EXCL_/, '');

        const fullPath = `${basePath}/${variable ? ':' : ''}${part}`;

        if (!excl) {
            output[fullPath] = true;
        }

        generateValidRoutes(routes[key], fullPath, output);
    }

    return output;
}

export const VALID_ROUTES = generateValidRoutes(DEFINED_ROUTES) as {
    [K in ValidPath]: true;
};

type NavigationNode = {
    build?: () => string;
} & {
    [key: string]: NavigationNode | ((param: string) => NavigationNode);
};

function createNavigationBuilder<
    T extends Record<string, any>,
    P extends string = ''
>(routes: T, basePath: P = '' as P): NavigationBuilder<T, P> {
    const builder: any = {};

    for (const rawKey in routes) {
        const [isExcluded, isVariable] = handleExclVar(rawKey);

        const stripped = rawKey.replace(/EXCL_/g, '').replace(/VAR_/g, '');
        const safeKey = stripped.replace(/-/g, '_');

        if (isVariable) {
            builder[safeKey] = (value: any) => {
                const childBuilder = createNavigationBuilder(
                    routes[rawKey],
                    `${basePath}/${value.toString()}`
                );
                if (!isExcluded) {
                    childBuilder.build = () =>
                        `${basePath}/${value.toString()}`;
                }
                return childBuilder;
            };
        } else {
            const nextPath = `${basePath}/${stripped}`.replace(/\/+/, '/');
            const childBuilder = createNavigationBuilder(
                routes[rawKey],
                nextPath
            );
            if (!isExcluded) {
                childBuilder.build = () => nextPath;
            }
            builder[safeKey] = childBuilder;
        }
    }

    return builder;
}

export const NAVIGATION_BUILDER = createNavigationBuilder(DEFINED_ROUTES);
