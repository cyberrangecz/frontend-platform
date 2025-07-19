import {NAMED_ROUTES, NAVIGATION_BUILDER} from "./router-definitions";
import {RoutingUtils} from "./utils";
import {UserAngGroupResolvers} from "./resolvers/user-and-group/user-and-group-resolver";

export namespace Routing {
    export namespace Resolvers {
        export import UserAndGroup = UserAngGroupResolvers;
    }

    export import Utils = RoutingUtils;
    export const NamedRoutes = NAMED_ROUTES;
    export const RouteBuilder = NAVIGATION_BUILDER;
}
