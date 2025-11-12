import { Observable } from 'rxjs';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { RoutingUtils } from '../../utils';
import { map } from 'rxjs/operators';
import { TrainingInstance, TrainingTypeEnum } from '@crczp/training-model';
import { TrainingResolverHelperService } from './training-resolver-helper.service';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';

function resolveInstance(
    route: ActivatedRouteSnapshot,
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum,
) {
    return service.getInstance(route, type).pipe(
        catchUndefinedOrNull('Training instance', () => {
            return service.navigateToInstanceOverview(type);
        }),
    );
}

function resolveInstanceTitle(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum,
): Observable<string> | string {
    if (RoutingUtils.containsSubroute('create', state)) {
        return type === TrainingTypeEnum.LINEAR
            ? 'Create Linear Training Instance'
            : 'Create Adaptive Training Instance';
    }

    function getTitleText(ti: TrainingInstance) {
        if (RoutingUtils.containsSubroute('edit', state)) {
            return `Edit ${ti.title}`;
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
        return ti.title || '';
    }

    return service
        .getInstance(route, type)
        .pipe(map((ti) => (ti ? getTitleText(ti) : '')));
}

function resolveInstanceBreadcrumb(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum,
): Observable<string> | string {
    if (RoutingUtils.containsSubroute('create', state)) {
        return 'Create';
    }

    function getBreadcrumbText(instance: TrainingInstance) {
        return RoutingUtils.containsSubroute('edit', state)
            ? `Edit ${instance.title}`
            : instance.title || '';
    }

    return service
        .getInstance(route, type)
        .pipe(map((ti) => (ti ? getBreadcrumbText(ti) : '')));
}

export const TrainingInstanceResolvers = {
    linearInstanceResolver: (
        route: ActivatedRouteSnapshot,
        _state: RouterStateSnapshot,
    ) =>
        resolveInstance(
            route,
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.LINEAR,
        ),
    adaptiveInstanceResolver: (
        route: ActivatedRouteSnapshot,
        _state: RouterStateSnapshot,
    ) =>
        resolveInstance(
            route,
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.ADAPTIVE,
        ),
    linearInstanceTitleResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        resolveInstanceTitle(
            route,
            state,
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.LINEAR,
        ),
    adaptiveInstanceTitleResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        resolveInstanceTitle(
            route,
            state,
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.ADAPTIVE,
        ),
    linearInstanceBreadcrumbResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        resolveInstanceBreadcrumb(
            route,
            state,
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.LINEAR,
        ),
    adaptiveInstanceBreadcrumbResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        resolveInstanceBreadcrumb(
            route,
            state,
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.ADAPTIVE,
        ),
};
