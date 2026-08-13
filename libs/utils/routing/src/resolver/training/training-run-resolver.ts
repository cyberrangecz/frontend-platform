import {
    ActivatedRouteSnapshot,
    RedirectCommand,
    RouterStateSnapshot,
} from '@angular/router';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AccessTrainingRunInfo } from '@crczp/training-model';
import { TrainingResolverHelperService } from './training-resolver-helper.service';
import { RoutingUtils } from '../../utils';

export function resolveRunAccess(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
): RedirectCommand | Observable<AccessTrainingRunInfo | RedirectCommand> {
    const service = inject(TrainingResolverHelperService);
    const runId = RoutingUtils.extractVariable<'run'>('runId', route);
    const runToken = RoutingUtils.extractVariable<'run'>('runToken', route);

    if (runId) {
        if (isNaN(+runId)) {
            return new RedirectCommand(service.runOverviewUrl());
        }
        return service.resumeRun(+runId);
    }
    if (!runToken) {
        return new RedirectCommand(service.runOverviewUrl());
    }
    return service.accessRun(runToken);
}
