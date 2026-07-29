import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { SandboxResolverHelperService } from './sandbox-resolver-helper.service';

/**
 * Resolves a pool's comment, or an empty string when it carries none.
 */
function resolvePoolComment(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
): Observable<string> {
    const service = inject(SandboxResolverHelperService);
    return service
        .getPool(route)
        .pipe(map((pool) => (pool && pool.comment ? pool.comment : '')));
}

export const PoolResolvers = {
    resolvePoolComment,
};
