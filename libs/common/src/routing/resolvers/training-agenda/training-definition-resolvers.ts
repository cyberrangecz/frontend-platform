import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
import {Observable, of} from "rxjs";
import {TrainingDefinition, TrainingTypeEnum} from "@crczp/training-model";
import {catchError, map, take} from "rxjs/operators";
import {RoutingUtils} from "../../utils";
import {inject} from "@angular/core";
import {AdaptiveTrainingDefinitionApi, LinearTrainingDefinitionApi} from "@crczp/training-api";
import {Routing} from "../../routing-namespace";
import {ErrorHandlerService} from "../../../error-handling/error-handler.service";

export namespace TrainingDefinitionResolvers {

    function getDefinitionOverviewRedirect(type: TrainingTypeEnum): UrlTree {
        return inject(Router).parseUrl(
            Routing.RouteBuilder[
                type === TrainingTypeEnum.LINEAR ? 'linear_definition' : 'adaptive_definition'
                ].build()
        )
    }

    function getDefinition(route: ActivatedRouteSnapshot, type: TrainingTypeEnum): Observable<TrainingDefinition | null> {
        const definitionId = RoutingUtils.extractVariable<'linear-definition' | 'adaptive-definition'>('definitionId', route);
        if (!definitionId) {
            return of(null);
        }

        const api = type === TrainingTypeEnum.LINEAR ?
            inject(LinearTrainingDefinitionApi) :
            inject(AdaptiveTrainingDefinitionApi);

        return api.get(+definitionId, false).pipe(
            take(1),
            catchError(err => {
                inject(ErrorHandlerService).emit(err, 'Resolving training definition');
                return of(null);
            })
        );

    }

    function buildDefinitionResolver(type: TrainingTypeEnum) {
        return (
            route: ActivatedRouteSnapshot,
            state: RouterStateSnapshot,
        ) => {

            return getDefinition(route, type).pipe(
                map((ti) => (ti ? ti : getDefinitionOverviewRedirect(type))),
                catchError((err) => {
                    inject(ErrorHandlerService).emit(err, 'Training definition resolver');
                    return of(getDefinitionOverviewRedirect(type));
                }),
            );
        }
    }

    export const linearDefinitionResolver = buildDefinitionResolver(TrainingTypeEnum.LINEAR);
    export const adaptiveDefinitionResolver = buildDefinitionResolver(TrainingTypeEnum.ADAPTIVE);

    function buildDefinitionTitleResolver(type: TrainingTypeEnum): (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) => Observable<string> | string {
        return (
            route: ActivatedRouteSnapshot,
            state: RouterStateSnapshot,
        ) => {

            if (RoutingUtils.containsSubroute('create', state)) {
                return type === TrainingTypeEnum.LINEAR ?
                    'Create Linear Training Definition' :
                    'Create Adaptive Training Definition';
            }

            function getTitleText(ti: TrainingDefinition) {
                if (RoutingUtils.containsSubroute('edit', state)) {
                    return `Edit ${ti.title}`
                }
                if (RoutingUtils.containsSubroute('detail', state)) {
                    return `Detail of ${ti.title}`;
                }
                return ti.title || ''
            }

            return getDefinition(route, type).pipe(
                map((ti) => {
                    if (!ti) {
                        return '';
                    }

                    return ti.title;
                }),
                catchError((err) => {
                    inject(ErrorHandlerService).emit(err, 'Training definition resolver');
                    return '';
                }),
            );
        }
    }


    export const linearDefinitionTitleResolver = buildDefinitionTitleResolver(TrainingTypeEnum.LINEAR);
    export const adaptiveDefinitionTitleResolver = buildDefinitionTitleResolver(TrainingTypeEnum.ADAPTIVE);

    function buildDefinitionBreadcrumbResolver(type: TrainingTypeEnum): (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) => Observable<string> | string {
        return (
            route: ActivatedRouteSnapshot,
            state: RouterStateSnapshot,
        ) => {
            return getDefinition(route, type).pipe(
                map((ti) => {
                    if (!ti) {
                        return '';
                    }
                    if (RoutingUtils.containsSubroute('create', state)) {
                        return 'Create';
                    }
                    if (RoutingUtils.containsSubroute('edit', state)) {
                        return `Edit ${ti.title}`;
                    }
                    if (RoutingUtils.containsSubroute(':definitionId/simulator', state)) {
                        return `Model simulator of ${ti.title}`;
                    }
                    return ti.title;
                }),
                catchError((err) => {
                    inject(ErrorHandlerService).emit(err, 'Training definition resolver');
                    return '';
                }),
            );
        }
    }


    export const linearDefinitionBreadcrumbResolver = buildDefinitionBreadcrumbResolver(TrainingTypeEnum.LINEAR);
    export const adaptiveDefinitionBreadcrumbResolver = buildDefinitionBreadcrumbResolver(TrainingTypeEnum.ADAPTIVE);

}
