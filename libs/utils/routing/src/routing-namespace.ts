import { RoutingUtils } from './utils';
import { NAVIGATION_BUILDER, VALID_ROUTES } from './router-definitions';
import { resolveRunAccess } from './resolver/training/training-run-resolver';
import { resolveSandbox } from './resolver/sandbox/sandbox-resolvers';
import {
    resolveGroup,
    resolvePool,
    resolveSandboxDefinition,
    resolveTrainingDefinition,
    resolveTrainingInstance,
    resolveUser,
} from './route-entities';

export const Routing = {
    Utils: RoutingUtils,
    Resolvers: {
        resolveTrainingInstance,
        resolveTrainingDefinition,
        resolvePool,
        resolveSandboxDefinition,
        resolveGroup,
        resolveUser,
        resolveSandbox,
        resolveRunAccess,
    },
    RouteBuilder: NAVIGATION_BUILDER,
    ValidRoutes: VALID_ROUTES,
};
