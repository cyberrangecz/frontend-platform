import { RoutingUtils } from './utils';
import { NAVIGATION_BUILDER } from './router-definitions';
import { UserResolvers } from './resolver/user-and-group/user-resolvers';
import { GroupResolvers } from './resolver/user-and-group/group-resolvers';
import { PoolResolvers } from './resolver/sandbox/pool-resolvers';
import { TrainingRunResolvers } from './resolver/training/training-run-resolver';
import { TrainingInstanceResolvers } from './resolver/training/training-instance-resolvers';
import { TrainingDefinitionResolvers } from './resolver/training/training-definition-resolvers';
import { CheatingDetectionResolvers } from './resolver/training/cheating-detection-resolvers';
import { SandboxResolvers } from './resolver/sandbox/sandbox-resolvers';
import { SandboxDefinitionResolvers } from './resolver/sandbox/sandbox-definition-resolvers';

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
