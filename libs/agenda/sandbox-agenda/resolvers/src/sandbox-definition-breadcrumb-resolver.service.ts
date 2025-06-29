import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { SandboxDefinition } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SANDBOX_TOPOLOGY_PATH } from '@crczp/sandbox-agenda';
import { SandboxDefinitionResolver } from 'libs/agenda/sandbox-agenda/resolvers/src/sandbox-definition-resolver.service';

/**
 * Router breadcrumb title provider
 */
@Injectable()
export class SandboxDefinitionBreadcrumbResolver implements Resolve<string> {
    constructor(private sandboxDefinitionResolver: SandboxDefinitionResolver) {}

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.endsWith(SANDBOX_TOPOLOGY_PATH)) {
            return 'Topology';
        }
        const sandboxDefinition$ = this.sandboxDefinitionResolver.resolve(route) as Observable<SandboxDefinition>;
        return sandboxDefinition$.pipe(map((sandboxDefinition) => `Sandbox Definition ${sandboxDefinition.id}`));
    }
}
