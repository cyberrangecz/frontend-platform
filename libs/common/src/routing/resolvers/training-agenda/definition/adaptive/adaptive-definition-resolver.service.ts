import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AdaptiveDefinitionApiService } from '@crczp/training-api';
import { TrainingDefinition } from '@crczp/training-model';
import { EMPTY, Observable, of } from 'rxjs';
import { catchError, mergeMap, take } from 'rxjs/operators';
import {
    ADAPTIVE_DEFINITION_PATH,
    ADAPTIVE_DEFINITION_SELECTOR,
    DEFINITION_NEW_PATH,
    TrainingErrorHandler,
} from '@crczp/training-agenda';

/**
 * Router data provider
 */
@Injectable()
export class AdaptiveDefinitionResolver {
    constructor(
        private api: AdaptiveDefinitionApiService,
        private errorHandler: TrainingErrorHandler,
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
    ): Observable<TrainingDefinition> | Promise<TrainingDefinition> | TrainingDefinition {
        if (state.url.endsWith(`${ADAPTIVE_DEFINITION_PATH}/${DEFINITION_NEW_PATH}`)) {
            return null;
        } else if (route.paramMap.has(ADAPTIVE_DEFINITION_SELECTOR)) {
            const id = Number(route.paramMap.get(ADAPTIVE_DEFINITION_SELECTOR));
            return this.api.get(id, true).pipe(
                take(1),
                mergeMap((td) => (td ? of(td) : this.navigateToNew())),
                catchError((err) => {
                    this.errorHandler.emit(err, 'Adaptive training definition resolver');
                    this.navigateToNew();
                    return EMPTY;
                }),
            );
        }
        return this.navigateToNew();
    }

    private navigateToNew(): Observable<never> {
        this.router.navigate([DEFINITION_NEW_PATH]);
        return EMPTY;
    }
}
