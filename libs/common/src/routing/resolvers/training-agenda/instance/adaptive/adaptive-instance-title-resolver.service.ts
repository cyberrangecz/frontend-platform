import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, take } from 'rxjs/operators';
import { ADAPTIVE_INSTANCE_PATH, ADAPTIVE_INSTANCE_SELECTOR, TRAINING_INSTANCE_NEW_PATH } from '@crczp/training-agenda';
import { AdaptiveInstanceResolver } from './adaptive-instance-resolver.service';

@Injectable()
export class AdaptiveInstanceTitleResolver {
    constructor(private adaptiveInstanceResolver: AdaptiveInstanceResolver) {}

    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.endsWith(`${ADAPTIVE_INSTANCE_PATH}/${TRAINING_INSTANCE_NEW_PATH}`)) {
            return 'Create Adaptive Training Instance';
        } else if (route.paramMap.has(ADAPTIVE_INSTANCE_SELECTOR)) {
            const resolved = this.adaptiveInstanceResolver.resolve(route, state) as Observable<TrainingInstance>;
            return resolved.pipe(
                take(1),
                mergeMap((ti) => (ti ? of(`Edit ${ti.title}`) : '')),
                catchError(() => ''),
            );
        }
        return '';
    }
}
