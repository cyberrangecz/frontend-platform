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
        variable: ValidPathParamByPrefix<Prefix>,
        path: ActivatedRouteSnapshot
    ): string | null {
        return path.paramMap.get(variable);
    }

    export function hasVariable(
        variable: ValidPathParam,
        path: ActivatedRouteSnapshot
    ) {
        return path.paramMap.has(variable);
    }

    export function containsSubroute<Prefix extends ValidSegment>(
        searchedSegment: ValidSubsegment<Prefix>,
        state: RouterStateSnapshot
    ) {
        // Replace :param with regex for any URL segment
        const segmentPattern = searchedSegment.replace(/:([^/]+)/g, '[^/]+');
        const regex = new RegExp(`/${segmentPattern}(?:/|$)`);

        // Ensure exactly one leading and trailing slash
        const normalizedUrl = `/${state.url.replace(/^\/|\/$/g, '')}/`;

        return regex.test(normalizedUrl);
    }

}


