import { Observable } from 'rxjs';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { RoutingUtils } from '../utils';
import { map } from 'rxjs/operators';
import { TrainingInstance, TrainingTypeEnum } from '@crczp/training-model';
import { TrainingResolverHelperService } from './training-resolver-helper.service';

function buildInstanceResolver(
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum
) {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        return service
            .getInstance(route, type)
            .pipe(
                map((ti) =>
                    ti ? ti : service.getInstanceOverviewRedirect(type)
                )
            );
    };
}

function linearInstanceResolver() {
    return buildInstanceResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.LINEAR
    );
}

function adaptiveInstanceResolver() {
    return buildInstanceResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.ADAPTIVE
    );
}

function buildInstanceTitleResolver(
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum
): (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => Observable<string> | string {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
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
    };
}

function linearInstanceTitleResolver() {
    return buildInstanceTitleResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.LINEAR
    );
}

function adaptiveInstanceTitleResolver() {
    return buildInstanceTitleResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.ADAPTIVE
    );
}

function buildInstanceBreadcrumbResolver(
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum
): (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => Observable<string> | string {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
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
    };
}

function linearInstanceBreadcrumbResolver() {
    return buildInstanceBreadcrumbResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.LINEAR
    );
}

function adaptiveInstanceBreadcrumbResolver() {
    return buildInstanceBreadcrumbResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.ADAPTIVE
    );
}

export const TrainingInstanceResolvers = {
    linearInstanceResolver,
    adaptiveInstanceResolver,
    linearInstanceTitleResolver,
    adaptiveInstanceTitleResolver,
    linearInstanceBreadcrumbResolver,
    adaptiveInstanceBreadcrumbResolver,
};
