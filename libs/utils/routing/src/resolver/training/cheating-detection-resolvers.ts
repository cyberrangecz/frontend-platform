import { Routing } from '../../routing-namespace';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { TrainingInstance, TrainingTypeEnum } from '@crczp/training-model';
import { inject } from '@angular/core';
import { TrainingResolverHelperService } from './training-resolver-helper.service';

/**
 * Retrieves a breadcrumb title based on provided url
 * @param route route snapshot
 * @param state router state snapshot
 */
function resolveCheatingDetectionBreadcrumb(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Observable<string> | string {
    if (Routing.Utils.containsSubroute('cheating-detection/create', state)) {
        return 'Create';
    }
    if (
        Routing.Utils.containsSubroute('cheating-detection/:detectionId', state)
    ) {
        return 'Detection detail';
    }
    if (Routing.Utils.containsSubroute('cheating-detection', state)) {
        return 'Cheating detections';
    }

    return '';
}

/**
 * Retrieves a specific resource title based on id provided in url
 * @param route route snapshot
 * @param state router state snapshot
 */
function resolveCheatingDetectionTitle(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Observable<string> | string {
    const instanceObservable = inject(
        TrainingResolverHelperService,
    ).getInstance(route, TrainingTypeEnum.LINEAR);
    return instanceObservable.pipe(
        take(1),
        map((ti) => (ti ? resolveTitle(ti, state) : '')),
    );
}

function resolveTitle(
    ti: TrainingInstance,
    state: RouterStateSnapshot,
): string {
    if (Routing.Utils.containsSubroute('cheating-detection/create', state)) {
        return `Create of cheating detection of ${ti.title}`;
    }
    if (Routing.Utils.containsSubroute('cheating-detection', state)) {
        return `Cheating detection events of ${ti.title}`;
    }
    return ti.title;
}

export const CheatingDetectionResolvers = {
    resolveCheatingDetectionBreadcrumb: resolveCheatingDetectionBreadcrumb,
    resolveCheatingDetectionTitle: resolveCheatingDetectionTitle,
};
