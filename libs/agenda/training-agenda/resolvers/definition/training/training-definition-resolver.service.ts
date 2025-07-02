import { Injectable, inject } from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {TrainingDefinitionApi} from '@crczp/training-api';
import {TrainingDefinition} from '@crczp/training-model';
import {EMPTY, Observable, of} from 'rxjs';
import {catchError, mergeMap, take} from 'rxjs/operators';
import {
    TRAINING_DEFINITION_NEW_PATH,
    TRAINING_DEFINITION_PATH,
    TRAINING_DEFINITION_SELECTOR,
    TrainingErrorHandler,
} from '@crczp/training-agenda';

/**
 * Router data provider
 */
@Injectable()
export class TrainingDefinitionResolver {
    private api = inject(TrainingDefinitionApi);
    private errorHandler = inject(TrainingErrorHandler);
    private router = inject(Router);


    /**
     * Retrieves a specific resource based on id provided in url. Navigates to a resource overview if no resource with such id exists.
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): Observable<TrainingDefinition> | Promise<TrainingDefinition> | TrainingDefinition {
        if (state.url.endsWith(`${TRAINING_DEFINITION_PATH}/${TRAINING_DEFINITION_NEW_PATH}`)) {
            return null;
        } else if (route.paramMap.has(TRAINING_DEFINITION_SELECTOR)) {
            const id = Number(route.paramMap.get(TRAINING_DEFINITION_SELECTOR));
            return this.api.get(id, true).pipe(
                take(1),
                mergeMap((td) => (td ? of(td) : this.navigateToNew())),
                catchError((err) => {
                    this.errorHandler.emit(err, 'Training definition resolver');
                    this.navigateToNew();
                    return EMPTY;
                }),
            );
        }
        return this.navigateToNew();
    }

    private navigateToNew(): Observable<never> {
        this.router.navigate([TRAINING_DEFINITION_NEW_PATH]);
        return EMPTY;
    }
}
