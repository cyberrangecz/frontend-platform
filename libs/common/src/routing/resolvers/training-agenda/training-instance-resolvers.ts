import {Observable, of} from "rxjs";
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
import {inject} from "@angular/core";
import {RoutingUtils} from "../../utils";
import {catchError, map, take} from "rxjs/operators";
import {AdaptiveInstanceApi, LinearTrainingInstanceApi} from "libs/api/training-api/src";
import {ErrorHandlerService} from "../../../error-handling/error-handler.service";
import {Routing} from "../../routing-namespace";
import {TrainingInstance, TrainingTypeEnum} from "@crczp/training-model";

export namespace TrainingInstanceResolvers {

    function getLinearInstanceOverviewRedirect(): UrlTree {
        return inject(Router).parseUrl(
            Routing.RouteBuilder.linear_instance.build()
        )
    }

    function getAdaptiveInstanceOverviewRedirect(): UrlTree {
        return inject(Router).parseUrl(
            Routing.RouteBuilder.adaptive_instance.build()
        )
    }

    function getInstance(route: ActivatedRouteSnapshot, type: TrainingTypeEnum): Observable<TrainingInstance | null> {
        const instanceId = RoutingUtils.extractVariable<'linear-instance' | 'adaptive-instance'>('instanceId', route);
        if (!instanceId) {
            return of(null);
        }

        const api = type === TrainingTypeEnum.LINEAR ?
            inject(LinearTrainingInstanceApi) :
            inject(AdaptiveInstanceApi);

        return api.get(+instanceId).pipe(
            take(1),
            catchError(err => {
                inject(ErrorHandlerService).emit(err, 'Resolving training instance');
                return of(null);
            })
        );

    }


    function buildInstanceResolver(type: TrainingTypeEnum) {
        return (
            route: ActivatedRouteSnapshot,
            state: RouterStateSnapshot,
        ) => {

            function getOverviewRedirect(): UrlTree {
                return type === TrainingTypeEnum.LINEAR ?
                    getLinearInstanceOverviewRedirect() :
                    getAdaptiveInstanceOverviewRedirect();
            }

            return getInstance(route, type).pipe(
                map((ti) => (ti ? ti : getOverviewRedirect())),
                catchError((err) => {
                    inject(ErrorHandlerService).emit(err, 'Training instance resolver');
                    return of(getOverviewRedirect());
                }),
            );
        }
    }

    export const linearInstanceResolver = buildInstanceResolver(TrainingTypeEnum.LINEAR);
    export const adaptiveInstanceResolver = buildInstanceResolver(TrainingTypeEnum.ADAPTIVE);

    function buildInstanceTitleResolver(type: TrainingTypeEnum): (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) => Observable<string> | string {
        return (
            route: ActivatedRouteSnapshot,
            state: RouterStateSnapshot,
        ) => {

            if (RoutingUtils.containsSubroute('create', state)) {
                return type === TrainingTypeEnum.LINEAR ?
                    'Create Linear Training Instance' :
                    'Create Adaptive Training Instance';
            }

            function getTitleText(ti: TrainingInstance) {
                if (RoutingUtils.containsSubroute('edit', state)) {
                    return `Edit ${ti.title}`
                }
                if (RoutingUtils.containsSubroute('detail', state)) {
                    return `Detail of ${ti.title}`;
                }
                if (RoutingUtils.containsSubroute('progress', state)) {
                    return `Progress of ${ti.title}`;
                }
                if (RoutingUtils.containsSubroute('results', state)) {
                    return `Results of ${ti.title}`;
                }
                if (RoutingUtils.containsSubroute('access-token', state)) {
                    return `Access Token of ${ti.title}`;
                }
                if (RoutingUtils.containsSubroute('runs', state)) {
                    return `Training Runs of ${ti.title}`;
                }
                if (RoutingUtils.containsSubroute('cheating-detection', state)) {
                    return `Cheating Detections of ${ti.title}`;
                }
                return ti.title || ''
            }

            return getInstance(route, type).pipe(
                map((ti) => {
                    if (!ti) {
                        return '';
                    }

                    return ti.title;
                }),
                catchError((err) => {
                    inject(ErrorHandlerService).emit(err, 'Training instance resolver');
                    return '';
                }),
            );
        }
    }


    export const linearInstanceTitleResolver = buildInstanceTitleResolver(TrainingTypeEnum.LINEAR);
    export const adaptiveInstanceTitleResolver = buildInstanceTitleResolver(TrainingTypeEnum.ADAPTIVE);

    function buildInstanceBreadcrumbResolver(type: TrainingTypeEnum): (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) => Observable<string> | string {
        return (
            route: ActivatedRouteSnapshot,
            state: RouterStateSnapshot,
        ) => {
            return getInstance(route, type).pipe(
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
                    return ti.title;
                }),
                catchError((err) => {
                    inject(ErrorHandlerService).emit(err, 'Training instance resolver');
                    return '';
                }),
            );
        }
    }


    export const linearInstanceBreadcrumbResolver = buildInstanceBreadcrumbResolver(TrainingTypeEnum.LINEAR);
    export const adaptiveInstanceBreadcrumbResolver = buildInstanceBreadcrumbResolver(TrainingTypeEnum.ADAPTIVE);

}
