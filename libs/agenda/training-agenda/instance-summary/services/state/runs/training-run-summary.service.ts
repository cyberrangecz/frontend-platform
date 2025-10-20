import { inject, Injectable } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { LinearRunApi, LinearTrainingInstanceApi, TrainingRunSort } from '@crczp/training-api';
import { TrainingRun, TrainingRunInfo } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ErrorHandlerService, PortalConfig } from '@crczp/utils';
import { CrczpOffsetElementsPaginatedService, OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Basic implementation of layer between component and API service.
 * Can manually get training runs and poll in regular intervals.
 */
@Injectable()
export class TrainingRunSummaryService extends CrczpOffsetElementsPaginatedService<TrainingRun> {
    private trainingInstanceApi = inject(LinearTrainingInstanceApi);
    private trainingRunApi = inject(LinearRunApi);
    private errorHandler = inject(ErrorHandlerService);

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Get all training runs for passed id and pagination and updates related observables or handles error
     * @param trainingInstanceId which training runs should be requested
     * @param pagination requested pagination
     */
    getAll(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent<TrainingRunSort>,
    ): Observable<OffsetPaginatedResource<TrainingRun>> {
        return this.trainingInstanceApi
            .getAssociatedTrainingRuns(trainingInstanceId, pagination)
            .pipe(
                tap(
                    (runs) => {
                        this.resourceSubject$.next(runs);
                    },
                    () => this.onGetAllError(),
                ),
            );
    }

    getInfo(trainingRunId: number): Observable<TrainingRunInfo[]> {
        return this.trainingRunApi.getInfo(trainingRunId).pipe(
            tap(
                (_) => _,
                () => this.hasErrorSubject$.next(true),
            ),
        );
    }

    /**
     * Get all scores from a specific training instance
     * @param trainingInstanceId id of training instance
     */
    exportScore(trainingInstanceId: number): Observable<any> {
        return this.trainingInstanceApi.exportScore(trainingInstanceId).pipe(
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Downloading training instance scores',
                    ),
            }),
        );
    }

    private onGetAllError() {
        this.hasErrorSubject$.next(true);
    }
}
