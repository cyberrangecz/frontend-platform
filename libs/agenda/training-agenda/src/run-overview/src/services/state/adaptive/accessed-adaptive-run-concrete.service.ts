import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { AdaptiveRunApi } from '@crczp/training-api';
import { AccessedTrainingRun } from '@crczp/training-model';
import { from, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TrainingErrorHandler, TrainingNavigator } from '../../../../../index';
import { TrainingAgendaContext } from '@crczp/training-agenda/internal';
import { AccessedAdaptiveRunService } from './accessed-adaptive-run.service';

/**
 * Basic implementation of layer between component and API service.
 */
@Injectable()
export class AccessedAdaptiveRunConcreteService extends AccessedAdaptiveRunService {
    constructor(
        private api: AdaptiveRunApi,
        private router: Router,
        private context: TrainingAgendaContext,
        private navigator: TrainingNavigator,
        private errorHandler: TrainingErrorHandler,
    ) {
        super(context.config.defaultPaginationSize);
    }

    /**
     * Gets paginated accessed training runs and updates related observables or handles error.
     * @param pagination requested pagination info
     */
    getAll(pagination: OffsetPaginationEvent): Observable<PaginatedResource<AccessedTrainingRun>> {
        this.hasErrorSubject$.next(false);
        return this.api.getAccessed(pagination).pipe(
            tap(
                (trainingRuns) => {
                    this.resourceSubject$.next(trainingRuns);
                },
                (err) => {
                    this.errorHandler.emit(err, 'Fetching adaptive runs');
                    this.hasErrorSubject$.next(true);
                },
            ),
        );
    }

    /**
     * Resumes in already started adaptive run or handles error.
     * @param id id of adaptive run to resume
     */
    resume(id: number): Observable<any> {
        return from(this.router.navigate([this.navigator.toResumeAdaptiveRun(id)]));
    }

    access(token: string): Observable<any> {
        return from(this.router.navigate([this.navigator.toAccessAdaptiveRun(token)]));
    }

    results(id: number): Observable<any> {
        return from(this.router.navigate([this.navigator.toTrainingRunResult(id)]));
    }
}
