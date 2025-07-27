import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AdaptiveRunApi, LinearRunApi } from '@crczp/training-api';
import { AccessedTrainingRun, TrainingTypeEnum } from '@crczp/training-model';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { SentinelFilter } from '@sentinel/common/filter';
import { OffsetPaginatedElementsService } from '@sentinel/common';
import { ErrorHandlerService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

/**
 * Basic implementation of layer between component and API service.
 */
@Injectable()
export class AccessedTrainingRunService extends OffsetPaginatedElementsService<AccessedTrainingRun> {
    public hasErrorSubject$ = new BehaviorSubject<boolean>(false);
    private trainingApi = inject(LinearRunApi);
    private adaptiveApi = inject(AdaptiveRunApi);
    private router = inject(Router);
    private errorHandler = inject(ErrorHandlerService);

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets paginated accessed training runs and updates related observables or handles error.
     * @param pagination requested pagination info
     * @param filter filters to be applied on resources
     */
    getAll(
        pagination: OffsetPaginationEvent,
        filter: string
    ): Observable<PaginatedResource<AccessedTrainingRun>> {
        this.hasErrorSubject$.next(false);
        const filters = filter ? [new SentinelFilter('title', filter)] : [];
        pagination.size = Number.MAX_SAFE_INTEGER;
        return this.trainingApi.getAccessed(pagination, filters).pipe(
            concatMap((trainingRuns) =>
                this.getAllAdaptive(pagination, trainingRuns)
            ),
            tap(
                (runs) => {
                    this.resourceSubject$.next(runs);
                },
                (err) => {
                    this.errorHandler.emit(err, 'Fetching training runs');
                    this.hasErrorSubject$.next(true);
                }
            )
        );
    }

    toResumeRun(id: number, type: TrainingTypeEnum): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.run[type].runId(id).resume.build(),
            ])
        );
    }

    toAccessRun(token: string, type: TrainingTypeEnum): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.run[type].runToken(token).access.build(),
            ])
        );
    }

    toRunResults(id: number, type: TrainingTypeEnum): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.run[type].runId(id).results.build(),
            ])
        );
    }

    showMitreTechniques(): Observable<any> {
        return from(
            this.router.navigate([Routing.RouteBuilder.mitre_techniques.build])
        );
    }

    private getAllAdaptive(
        pagination: OffsetPaginationEvent,
        trainingRuns: PaginatedResource<AccessedTrainingRun>
    ): Observable<PaginatedResource<AccessedTrainingRun>> {
        return this.adaptiveApi.getAccessed(pagination).pipe(
            map(
                (adaptiveRuns) => {
                    trainingRuns.elements = [
                        ...trainingRuns.elements,
                        ...adaptiveRuns.elements,
                    ];
                    return trainingRuns;
                },
                (err) => {
                    this.errorHandler.emit(err, 'Fetching adaptive runs');
                    this.hasErrorSubject$.next(true);
                }
            )
        );
    }
}
