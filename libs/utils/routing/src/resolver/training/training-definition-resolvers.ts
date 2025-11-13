import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { TrainingDefinition, TrainingTypeEnum } from '@crczp/training-model';
import { inject } from '@angular/core';
import { RoutingUtils } from '../../utils';
import { map } from 'rxjs/operators';
import { TrainingResolverHelperService } from './training-resolver-helper.service';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';

function buildDefinitionResolver(
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum,
    includeLevels = false,
) {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        if (RoutingUtils.containsSubroute('create', state)) {
            return null;
        }

        return service
            .getDefinition(route, type, includeLevels)
            .pipe(
                catchUndefinedOrNull('Training Definition', () =>
                    service.navigateToDefinitionOverview(type),
                ),
            );
    };
}

function buildDefinitionTitleResolver(
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum,
): (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => Observable<string> | string {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        if (RoutingUtils.containsSubroute('create', state)) {
            return type === TrainingTypeEnum.LINEAR
                ? 'Create Linear Training Definition'
                : 'Create Adaptive Training Definition';
        }

        function getTitleText(ti: TrainingDefinition) {
            if (RoutingUtils.containsSubroute('edit', state)) {
                return `Edit ${ti.title}`;
            }
            if (RoutingUtils.containsSubroute('detail', state)) {
                return `Detail of ${ti.title}`;
            }
            return ti.title || '';
        }

        return service
            .getDefinition(route, type)
            .pipe(map((ti) => (ti ? getTitleText(ti) : '')));
    };
}

function buildDefinitionBreadcrumbResolver(
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum,
): (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => Observable<string> | string {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        function getBreadcrumbText(
            ti: TrainingDefinition,
            state: RouterStateSnapshot,
        ): string {
            if (RoutingUtils.containsSubroute('edit', state)) {
                return `Edit ${ti.title}`;
            }
            if (
                RoutingUtils.containsSubroute(':definitionId/simulator', state)
            ) {
                return `Model simulator of ${ti.title}`;
            }
            return ti.title;
        }

        if (RoutingUtils.containsSubroute('create', state)) {
            return 'Create';
        }
        return service
            .getDefinition(route, type)
            .pipe(map((ti) => (ti ? getBreadcrumbText(ti, state) : '')));
    };
}

export const TrainingDefinitionResolvers = {
    linearDefinitionResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        buildDefinitionResolver(
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.LINEAR,
        )(route, state),
    linearDefinitionWithLevelsResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        buildDefinitionResolver(
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.LINEAR,
            true,
        )(route, state),
    adaptiveDefinitionResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        buildDefinitionResolver(
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.ADAPTIVE,
        )(route, state),
    adaptiveDefinitionWithLevelsResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        buildDefinitionResolver(
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.ADAPTIVE,
            true,
        )(route, state),
    linearDefinitionTitleResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        buildDefinitionTitleResolver(
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.LINEAR,
        )(route, state),
    adaptiveDefinitionTitleResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        buildDefinitionTitleResolver(
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.ADAPTIVE,
        )(route, state),
    linearDefinitionBreadcrumbResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        buildDefinitionBreadcrumbResolver(
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.LINEAR,
        )(route, state),
    adaptiveDefinitionBreadcrumbResolver: (
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ) =>
        buildDefinitionBreadcrumbResolver(
            inject(TrainingResolverHelperService),
            TrainingTypeEnum.ADAPTIVE,
        )(route, state),
};
