import {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { inject } from '@angular/core';
import { Routing } from '../routing-namespace';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
    AccessTrainingRunInfo,
    TrainingRun,
    TrainingTypeEnum,
} from '@crczp/training-model';
import { TrainingResolverHelperService } from './training-resolver-helper.service';

function resolveRunAccess(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<AccessTrainingRunInfo | UrlTree> | UrlTree {
    const service = inject(TrainingResolverHelperService);
    const runId = Routing.Utils.extractVariable<'run'>('runId', route);
    const runToken = Routing.Utils.extractVariable<'run'>('runToken', route);
    const isAdaptive = Routing.Utils.containsSubroute('run/adaptive', state);
    const type = isAdaptive
        ? TrainingTypeEnum.ADAPTIVE
        : TrainingTypeEnum.LINEAR;

    if (runId) {
        if (isNaN(+runId)) {
            return service.getRunOverviewRedirect();
        }
        return service.resumeRun(+runId, type);
    }
    if (!runToken) {
        return service.getRunOverviewRedirect();
    }
    return service.accessRun(runToken, type);
}

function resolveAccessedTrainingRunResults(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<TrainingRun | UrlTree> | UrlTree {
    const service = inject(TrainingResolverHelperService);
    const isAdaptive = Routing.Utils.containsSubroute('run/adaptive', state);
    const type = isAdaptive
        ? TrainingTypeEnum.ADAPTIVE
        : TrainingTypeEnum.LINEAR;

    return service
        .getRunResults(route, type)
        .pipe(map((tr) => tr || service.getRunOverviewRedirect()));
}

export const TrainingRunResolvers = {
    resolveRunAccess,
    resolveAccessedTrainingRunResults,
};
