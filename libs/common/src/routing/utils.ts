import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
import {inject} from "@angular/core";
import {
    ValidPath,
    ValidPathParam,
    ValidPathParamByPrefix,
    ValidPathPrefix,
    ValidPathSuffix,
    ValidSegment,
    ValidSubsegment
} from "./router-types";

export namespace RoutingUtils {

    export function createUrlTree(route: ValidPath, router?: Router): UrlTree {
        const routerSure = router || inject(Router);
        return routerSure.parseUrl(route);
    }

    export function appendPath<Prefix extends ValidPathPrefix>(prefix: ValidPathPrefix, suffix: ValidPathSuffix<Prefix>): ValidPath {
        return `${prefix}/${suffix}` as ValidPath;
    }

    export function extractVariable<Prefix extends ValidPathPrefix>(
        path: ActivatedRouteSnapshot,
        variable: ValidPathParamByPrefix<Prefix>
    ): string | null {
        return path.paramMap.get(variable);
    }

    export function hasVariable(
        path: ActivatedRouteSnapshot,
        variable: ValidPathParam
    ) {
        return path.paramMap.has(variable);
    }

    export function containsSubroute<Prefix extends ValidSegment>(
        state: RouterStateSnapshot,
        searchedSegment: ValidSubsegment<Prefix>
    ) {
        return ('/' + state.url + '/').includes(`/${searchedSegment}/`);
    }

}


