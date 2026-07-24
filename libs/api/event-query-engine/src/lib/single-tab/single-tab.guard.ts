import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes, UrlTree } from '@angular/router';
import { CACHE_CLAIM } from './single-tab-claim';
import { CacheBlockedComponent } from './cache-blocked.component';

/** Route path of the blocked screen that {@link withSingleTabGuard} installs. */
export const CACHE_BLOCKED_PATH = 'cache-blocked';

/**
 * Route guard that diverts a tab without the single-writer cache claim to the blocked screen,
 * preserving the requested URL so the tab can resume there once it recovers the claim.
 *
 * @returns `true` for the holding tab; a redirecting {@link UrlTree} to the blocked screen otherwise.
 */
export const singleTabCacheGuard: CanActivateFn = async (_route, state): Promise<boolean | UrlTree> => {
    const claim = inject(CACHE_CLAIM);
    const router = inject(Router);
    const blocked = await claim.blocked;
    if (!blocked) {
        return true;
    }
    return router.createUrlTree([CACHE_BLOCKED_PATH], { queryParams: { redirect: state.url } });
};

/**
 * Wraps an application's routes with single-tab enforcement: every supplied top-level route that
 * activates a component gains {@link singleTabCacheGuard} ahead of its existing guards, and the
 * unguarded blocked-screen route is prepended so it stays reachable (and never self-redirects) even
 * past a wildcard route. Pure redirect routes are left untouched; their targets carry the guard.
 *
 * @param routes The application's top-level routes.
 * @returns The routes with the blocked route prepended and the guard applied to the activatable ones.
 */
export function withSingleTabGuard(routes: Routes): Routes {
    const guarded: Routes = routes.map((route) =>
        route.redirectTo !== undefined
            ? route
            : { ...route, canActivate: [singleTabCacheGuard, ...(route.canActivate ?? [])] },
    );
    return [{ path: CACHE_BLOCKED_PATH, component: CacheBlockedComponent }, ...guarded];
}
