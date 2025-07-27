import { RoutingUtils } from './utils';
import { NAVIGATION_BUILDER } from './router-definitions';
import { UserResolvers } from './user-and-group/user-resolvers';
import { GroupResolvers } from './user-and-group/group-resolvers';
import { PoolResolvers } from './sandbox/pool-resolvers';
import { TrainingRunResolvers } from './training/training-run-resolver';
import { TrainingInstanceResolvers } from './training/training-instance-resolvers';
import { TrainingDefinitionResolvers } from './training/training-definition-resolvers';
import { CheatingDetectionResolvers } from './training/cheating-detection-resolvers';
import { SandboxResolvers } from './sandbox/sandbox-resolvers';
import { SandboxDefinitionResolvers } from './sandbox/sandbox-definition-resolvers';

export const Routing = {
    Utils: RoutingUtils,
    Resolvers: {
        User: UserResolvers,
        Group: GroupResolvers,
        TrainingRun: TrainingRunResolvers,
        TrainingInstance: TrainingInstanceResolvers,
        TrainingDefinition: TrainingDefinitionResolvers,
        CheatingDetection: CheatingDetectionResolvers,
        Sandbox: SandboxResolvers,
        Pool: PoolResolvers,
        SandboxDefinition: SandboxDefinitionResolvers,
    },
    RouteBuilder: NAVIGATION_BUILDER,
};
