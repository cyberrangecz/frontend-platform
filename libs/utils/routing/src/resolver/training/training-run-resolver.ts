import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { Routing } from '../../routing-namespace';
import { TrainingTypeEnum } from '@crczp/training-model';
import { TrainingResolverHelperService } from './training-resolver-helper.service';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';

function resolveRunAccess(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) {
    const service = inject(TrainingResolverHelperService);
    const runId = Routing.Utils.extractVariable<'run'>('runId', route);
    const runToken = Routing.Utils.extractVariable<'run'>('runToken', route);
    const isAdaptive = Routing.Utils.containsSubroute('run/adaptive', state);
    const type = isAdaptive
        ? TrainingTypeEnum.ADAPTIVE
        : TrainingTypeEnum.LINEAR;

    if (runId) {
        if (isNaN(+runId)) {
            return service.navigateToRunOverview();
        }
        return service.resumeRun(+runId, type);
    }
    if (!runToken) {
        return service.navigateToRunOverview();
    }
    return service.accessRun(runToken, type);
}

function resolveAccessedTrainingRunResults(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) {
    const service = inject(TrainingResolverHelperService);
    const isAdaptive = Routing.Utils.containsSubroute('run/adaptive', state);
    const type = isAdaptive
        ? TrainingTypeEnum.ADAPTIVE
        : TrainingTypeEnum.LINEAR;

    return service
        .getRunResults(route, type)
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
