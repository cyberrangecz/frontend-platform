import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
import {Observable, of} from "rxjs";
import {RoutingUtils} from "../../utils";
import {inject} from "@angular/core";
import {catchError, map, take} from "rxjs/operators";
import {SandboxDefinitionApi} from "@crczp/sandbox-api";
import {SandboxDefinition} from "@crczp/sandbox-model";
import {Routing} from "../../routing-namespace";
import {ErrorHandlerService} from "../../../error-handling/error-handler.service";

export namespace SandboxDefinitionResolvers {

    function getSandboxDefinitionOverviewRedirect(): UrlTree {
        return inject(Router).createUrlTree([Routing.RouteBuilder.sandbox_definition.build()]);
    }

    function getSandboxDefinition(
        route: ActivatedRouteSnapshot,
    ): Observable<SandboxDefinition | null> {
        const definitionId = RoutingUtils.extractVariable('definitionId', route);
        if (!definitionId) {
            return of(null);
        }

        return inject(SandboxDefinitionApi).get(+definitionId).pipe(
            take(1),
            catchError(err => {
                inject(ErrorHandlerService).emit(err, 'Resolving sandbox definition');
                return of(null);
            })
        );
    }

    export function resolveSandboxDefinition(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): Observable<SandboxDefinition | UrlTree> | UrlTree | null {
        if (RoutingUtils.hasVariable('definitionId', route)) {
            return getSandboxDefinition(route).pipe(
                map((definition) => definition || getSandboxDefinitionOverviewRedirect()),
            );
        }
        return getSandboxDefinitionOverviewRedirect();
    }


    export function resolveSandboxDefinitionBreadcrumb(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> {
        if (RoutingUtils.containsSubroute('sandbox-definition/create', state)) {
            return of('Create Sandbox Definition');
        }

        const definition$ = getSandboxDefinition(route);
        return definition$.pipe(
            take(1),
            map((definition) => {
                if (!definition) {
                    return 'Sandbox Definition';
                }
                return `Sandbox Definition ${definition.title}`;
            }),
        );
    }
}
