import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Router} from '@angular/router';
import {AdaptiveRunApi} from '@crczp/training-api';
import {TrainingRun} from '@crczp/training-model';
import {EMPTY, Observable, of} from 'rxjs';
import {catchError, mergeMap, take} from 'rxjs/operators';
import {ADAPTIVE_RUN_SELECTOR, TrainingErrorHandler, TrainingNavigator} from '@crczp/training-agenda';

@Injectable()
export class AdaptiveRunResultsResolver {
    private api = inject(AdaptiveRunApi);
    private errorHandler = inject(TrainingErrorHandler);
    private navigator = inject(TrainingNavigator);
    private router = inject(Router);


    resolve(route: ActivatedRouteSnapshot): Observable<TrainingRun> | Promise<TrainingRun> | TrainingRun {
        if (route.paramMap.has(ADAPTIVE_RUN_SELECTOR)) {
            const id = Number(route.paramMap.get(ADAPTIVE_RUN_SELECTOR));
            return this.api.get(id).pipe(
                take(1),
                mergeMap((tr) => (tr ? of(tr) : this.navigateToOverview())),
                catchError((err) => {
                    this.errorHandler.emit(err, 'Adaptive run results');
                    this.navigateToOverview();
                    return EMPTY;
                }),
            );
        }
        return this.navigateToOverview();
    }

    private navigateToOverview(): Observable<never> {
        this.router.navigate([this.navigator.toTrainingRunOverview()]);
        return EMPTY;
    }
}
