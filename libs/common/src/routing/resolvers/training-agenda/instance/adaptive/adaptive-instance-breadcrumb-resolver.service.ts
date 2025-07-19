import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    ADAPTIVE_INSTANCE_SELECTOR,
    TRAINING_INSTANCE_EDIT_PATH,
    TRAINING_INSTANCE_NEW_PATH,
} from '@crczp/training-agenda';
import { AdaptiveInstanceResolver } from './adaptive-instance-resolver.service';

/**
 * Router breadcrumb title provider
 */
@Injectable()
export class AdaptiveInstanceBreadcrumbResolver {
    constructor(private adaptiveInstanceResolver: AdaptiveInstanceResolver) {}

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.endsWith(TRAINING_INSTANCE_NEW_PATH)) {
            return 'Create';
        } else if (route.paramMap.has(ADAPTIVE_INSTANCE_SELECTOR)) {
            const resolved = this.adaptiveInstanceResolver.resolve(route, state) as Observable<TrainingInstance>;
            return resolved.pipe(map((ti) => (ti ? this.getBreadcrumbFromInstance(ti, state) : '')));
        }
        return EMPTY;
    }

    private getBreadcrumbFromInstance(trainingInstance: TrainingInstance, state: RouterStateSnapshot): string {
        return state.url.includes(TRAINING_INSTANCE_EDIT_PATH)
            ? `Edit ${trainingInstance.title}`
            : trainingInstance.title;
    }
}
