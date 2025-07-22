import {UserResolvers} from "./resolvers/user-and-group/user-resolvers";
import {TrainingDefinitionResolvers} from "./resolvers/training-agenda/training-definition-resolvers";
import {TrainingRunResolvers} from "./resolvers/training-agenda/training-run-resolver";
import {PoolResolvers} from "./resolvers/sandbox/pool-resolvers";
import {SandboxDefinitionResolvers} from "./resolvers/sandbox/sandbox-definition-resolvers";
import {SandboxResolvers} from "./resolvers/sandbox/sandbox-resolvers";
import {RoutingUtils} from "./utils";
import {NAVIGATION_BUILDER} from "./router-definitions";
import {TrainingInstanceResolvers} from "./resolvers/training-agenda/training-instance-resolvers";
import {GroupResolvers} from "./resolvers/user-and-group/group-resolvers";


export namespace Routing {
    export namespace Resolvers {
        export import User = UserResolvers;
        export import Group = GroupResolvers;
        export import TrainingInstance = TrainingInstanceResolvers;
        export import TrainingDefinition = TrainingDefinitionResolvers;
        export import TrainingRun = TrainingRunResolvers;
        export import Pool = PoolResolvers;
        export import SandboxDefinition = SandboxDefinitionResolvers;
        export import Sandbox = SandboxResolvers;
    }

    export import Utils = RoutingUtils;
    export const RouteBuilder = NAVIGATION_BUILDER;
}
