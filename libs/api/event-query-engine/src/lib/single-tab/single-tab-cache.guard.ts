import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes, UrlTree } from '@angular/router';
import { CACHE_CLAIM } from './single-tab-claim';
import { CacheBlockedComponent } from './cache-blocked.component';

/** Route path of the blocked screen that {@link withCacheBlockedRoute} installs. */
export const CACHE_BLOCKED_PATH = 'cache-blocked';

/**
 * Route guard that diverts a tab without the single-writer cache claim to the blocked screen,
 * preserving the requested URL so the tab can resume there once it recovers the claim.
 *
 * Attach it to every route whose activated component tree reads the event cache, and to no other:
 * a route carrying it is unreachable for as long as another tab holds the claim, while a route
 * reaching the cache without it renders normally and then hangs on its first query, because the
 * database handle a non-holding tab awaits never resolves.
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
 * Prepends the unguarded blocked-screen route to an application's routes, so a tab diverted by
 * {@link singleTabCacheGuard} always reaches it — even past a wildcard route — and the screen itself
 * never self-redirects.
 *
 * The supplied routes are returned untouched. Enforcement is opt-in per route: attach
 * {@link singleTabCacheGuard} to each route that reads the event cache, leaving the rest reachable
 * from a tab that does not hold the claim.
 *
 * @param routes The application's top-level routes.
 * @returns The routes with the blocked-screen route prepended.
 */
export function withCacheBlockedRoute(routes: Routes): Routes {
    return [{ path: CACHE_BLOCKED_PATH, component: CacheBlockedComponent }, ...routes];
}
