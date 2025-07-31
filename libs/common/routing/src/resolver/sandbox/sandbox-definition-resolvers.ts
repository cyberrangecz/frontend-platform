import {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { RoutingUtils } from '../../utils';
import { SandboxDefinition } from '@crczp/sandbox-model';
import { map, take } from 'rxjs/operators';
import { SandboxResolverHelperService } from './sandbox-resolver-helper.service';
import { inject } from '@angular/core';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';

export function resolveSandboxDefinition(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<SandboxDefinition | UrlTree> | UrlTree | null {
    const service = inject(SandboxResolverHelperService);
    if (RoutingUtils.hasVariable('definitionId', route)) {
        return service
            .getSandboxDefinition(route)
            .pipe(
                catchUndefinedOrNull('Sandbox Definition', () =>
                    service.navigateToSandboxDefinitionOverview()
                )
            );
    }
    return service.navigateToSandboxDefinitionOverview();
}

export function resolveSandboxDefinitionBreadcrumb(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<string> {
    if (RoutingUtils.containsSubroute('sandbox-definition/create', state)) {
        return of('Create Sandbox Definition');
    }

    const service = inject(SandboxResolverHelperService);

    return service.getSandboxDefinition(route).pipe(
        take(1),
        map((definition) => {
            if (!definition) {
                return 'Sandbox Definition';
            }
            return `Sandbox Definition ${definition.title}`;
        })
    );
}

export const SandboxDefinitionResolvers = {
    resolveSandboxDefinition,
    resolveSandboxDefinitionBreadcrumb,
};
