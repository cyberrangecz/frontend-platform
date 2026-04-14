import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { TrainingResolverHelperService } from './training-resolver-helper.service';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';
import { RoutingUtils } from '../../utils';

function resolveRunAccess(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) {
    const service = inject(TrainingResolverHelperService);
    const runId = RoutingUtils.extractVariable<'run'>('runId', route);
    const runToken = RoutingUtils.extractVariable<'run'>('runToken', route);

    if (runId) {
        if (isNaN(+runId)) {
            return service.navigateToRunOverview();
        }
        return service.resumeRun(+runId);
    }
    if (!runToken) {
        return service.navigateToRunOverview();
    }
    return service.accessRun(runToken);
}

function resolveAccessedTrainingRunResults(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) {
    const service = inject(TrainingResolverHelperService);

    return service
        .getRunResults(route)
        .pipe(
            catchUndefinedOrNull('Training run', () =>
                service.navigateToRunOverview()
            )
        );
}

export const TrainingRunResolvers = {
    resolveRunAccess,
    resolveAccessedTrainingRunResults,
};
