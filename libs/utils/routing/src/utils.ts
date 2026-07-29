import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import {
    ValidPath,
    ValidPathParam,
    ValidPathParamByPrefix,
    ValidPathPrefix,
    ValidPathSuffix,
} from './router-types';

function createUrlTree(route: ValidPath, router?: Router): UrlTree {
    const routerSure = router || inject(Router);
    return routerSure.parseUrl(route);
}

function appendPath<Prefix extends ValidPathPrefix>(
    prefix: ValidPathPrefix,
    suffix: ValidPathSuffix<Prefix>
): ValidPath {
    return `${prefix}/${suffix}` as ValidPath;
}

function extractVariable<Prefix extends ValidPathPrefix>(
    variable: ValidPathParamByPrefix<Prefix>,
    path: ActivatedRouteSnapshot
): string | null {
    return path.paramMap.get(variable);
}

function hasVariable(variable: ValidPathParam, path: ActivatedRouteSnapshot) {
    return path.paramMap.has(variable);
}

export const RoutingUtils = {
    createUrlTree,
    appendPath,
    extractVariable,
    hasVariable,
};
