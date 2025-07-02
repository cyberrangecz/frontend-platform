import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {SandboxInstance} from '@crczp/sandbox-model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {SANDBOX_TOPOLOGY_PATH} from '@crczp/sandbox-agenda';
import {SandboxInstanceResolver} from './sandbox-instance-resolver.service';

/**
 * Router breadcrumb title provider
 */
@Injectable()
export class SandboxInstanceBreadcrumbResolver implements Resolve<string> {
    constructor(private sandboxInstanceResolver: SandboxInstanceResolver) {}

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.endsWith(SANDBOX_TOPOLOGY_PATH)) {
            return 'Topology';
        }
        const sandboxInstance$ = this.sandboxInstanceResolver.resolve(route) as Observable<SandboxInstance>;
        return sandboxInstance$.pipe(map((sandboxInstance) => `Sandbox ${sandboxInstance.id}`));
    }
}
