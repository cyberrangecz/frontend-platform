import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, mergeMap, take } from 'rxjs/operators';
import {
    ADAPTIVE_INSTANCE_PATH,
    ADAPTIVE_INSTANCE_SELECTOR,
    TRAINING_INSTANCE_NEW_PATH,
    TrainingErrorHandler,
    TrainingNavigator,
} from '@crczp/training-agenda';
import { AdaptiveInstanceApi } from '@crczp/training-api';

/**
 * Router data provider
 */
@Injectable()
export class AdaptiveInstanceResolver {
    constructor(
        private api: AdaptiveInstanceApi,
        private errorHandler: TrainingErrorHandler,
        private navigator: TrainingNavigator,
        private router: Router,
    ) {}

    /**
     * Retrieves a specific resource based on id provided in url. Navigates to a resource overview if no resource with such id exists.
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): Observable<TrainingInstance> | Promise<TrainingInstance> | TrainingInstance {
        if (state.url.endsWith(`${ADAPTIVE_INSTANCE_PATH}/${TRAINING_INSTANCE_NEW_PATH}`)) {
            return null;
        }
        if (route.paramMap.has(ADAPTIVE_INSTANCE_SELECTOR)) {
            const id = Number(route.paramMap.get(ADAPTIVE_INSTANCE_SELECTOR));
            return this.api.get(id).pipe(
                take(1),
                mergeMap((ti) => (ti ? of(ti) : this.navigateToNew())),
                catchError((err) => {
                    this.errorHandler.emit(err, 'Adaptive instance resolver');
                    this.navigateToNew();
                    return EMPTY;
                }),
            );
        }
        return this.navigateToNew();
    }

    private navigateToNew(): Observable<never> {
        this.router.navigate([this.navigator.toTrainingInstanceOverview()]);
        return EMPTY;
    }
}
