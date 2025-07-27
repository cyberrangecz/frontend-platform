import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { TrainingDefinition, TrainingTypeEnum } from '@crczp/training-model';
import { inject } from '@angular/core';
import { RoutingUtils } from '../utils';
import { map } from 'rxjs/operators';
import { TrainingResolverHelperService } from './training-resolver-helper.service';

function buildDefinitionResolver(
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum
) {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        return service
            .getDefinition(route, type)
            .pipe(
                map((ti) =>
                    ti ? ti : service.getDefinitionOverviewRedirect(type)
                )
            );
    };
}

function linearDefinitionResolver() {
    buildDefinitionResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.LINEAR
    );
}

function adaptiveDefinitionResolver() {
    buildDefinitionResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.ADAPTIVE
    );
}

function buildDefinitionTitleResolver(
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum
): (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
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

function linearDefinitionTitleResolver() {
    buildDefinitionTitleResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.LINEAR
    );
}

function adaptiveDefinitionTitleResolver() {
    buildDefinitionTitleResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.ADAPTIVE
    );
}

function buildDefinitionBreadcrumbResolver(
    service: TrainingResolverHelperService,
    type: TrainingTypeEnum
): (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => Observable<string> | string {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        function getBreadcrumbText(
            ti: TrainingDefinition,
            state: RouterStateSnapshot
        ): string {
            if (RoutingUtils.containsSubroute('create', state)) {
                return 'Create';
            }
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

        return service
            .getDefinition(route, type)
            .pipe(map((ti) => (ti ? getBreadcrumbText(ti, state) : '')));
    };
}

function linearDefinitionBreadcrumbResolver() {
    buildDefinitionBreadcrumbResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.LINEAR
    );
}

function adaptiveDefinitionBreadcrumbResolver() {
    buildDefinitionBreadcrumbResolver(
        inject(TrainingResolverHelperService),
        TrainingTypeEnum.ADAPTIVE
    );
}

export const TrainingDefinitionResolvers = {
    linearDefinitionResolver: linearDefinitionResolver,
    adaptiveDefinitionResolver: adaptiveDefinitionResolver,
    linearDefinitionTitleResolver: linearDefinitionTitleResolver,
    adaptiveDefinitionTitleResolver: adaptiveDefinitionTitleResolver,
    linearDefinitionBreadcrumbResolver: linearDefinitionBreadcrumbResolver,
    adaptiveDefinitionBreadcrumbResolver: adaptiveDefinitionBreadcrumbResolver,
};
