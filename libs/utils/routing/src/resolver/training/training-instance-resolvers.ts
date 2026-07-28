import { Observable } from 'rxjs';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { RoutingUtils } from '../../utils';
import { map } from 'rxjs/operators';
import { TrainingInstance } from '@crczp/training-model';
import { TrainingResolverHelperService } from './training-resolver-helper.service';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';

function resolveInstance(
    route: ActivatedRouteSnapshot,
    service: TrainingResolverHelperService,
) {
    return service.getInstance(route).pipe(
        catchUndefinedOrNull('Training instance', () => {
            return service.navigateToInstanceOverview();
        }),
    );
}

function resolveInstanceTitle(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
    service: TrainingResolverHelperService,
): Observable<string> | string {
    if (RoutingUtils.containsSubroute('linear-instance/create', state)) {
        return 'Create Linear Training Instance';
    }

    function getTitleText(ti: TrainingInstance) {
        if (RoutingUtils.containsSubroute('edit', state)) {
            return `Edit ${ti.title}`;
        }
        if (RoutingUtils.containsSubroute('detail', state)) {
            return `Detail of ${ti.title}`;
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
        return ti.title || '';
    }

    return service
        .getInstance(route)
        .pipe(map((ti) => (ti ? getTitleText(ti) : '')));
}

function resolveInstanceBreadcrumb(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
    service: TrainingResolverHelperService,
): Observable<string> | string {
    if (RoutingUtils.containsSubroute('linear-instance/create', state)) {
        return 'Create';
    }

    function getBreadcrumbText(instance: TrainingInstance) {
        return RoutingUtils.containsSubroute('edit', state)
            ? `Edit ${instance.title}`
            : instance.title || '';
    }

    return service
        .getInstance(route)
        .pipe(map((ti) => (ti ? getBreadcrumbText(ti) : '')));
}

export const TrainingInstanceResolvers = {
    linearInstanceResolver: (
        route: ActivatedRouteSnapshot,
        _state: RouterStateSnapshot,
    ) => resolveInstance(route, inject(TrainingResolverHelperService)),
    linearInstanceTitleResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        resolveInstanceTitle(
            route,
            state,
            inject(TrainingResolverHelperService),
        ),
    linearInstanceBreadcrumbResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        resolveInstanceBreadcrumb(
            route,
            state,
            inject(TrainingResolverHelperService),
        ),
};
