import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AccessedTrainingRunSort, LinearRunApi } from '@crczp/training-api';
import { AccessedTrainingRun } from '@crczp/training-model';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { ErrorHandlerService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import { CrczpOffsetElementsPaginatedService, OffsetPaginatedResource, QueryParam } from '@crczp/api-common';

/**
 * Basic implementation of layer between component and API service.
 */
@Injectable()
export class AccessedTrainingRunService extends CrczpOffsetElementsPaginatedService<AccessedTrainingRun> {
    public hasErrorSubject$ = new BehaviorSubject<boolean>(false);
    override resource$ = this.resourceSubject$
        .asObservable()
        .pipe(
            map((elements) =>
                OffsetPaginatedResource.fromPaginatedElements(elements),
            ),
        );

    private trainingApi = inject(LinearRunApi);
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
        pagination: OffsetPaginationEvent<AccessedTrainingRunSort>,
        filter: string,
    ): Observable<OffsetPaginatedResource<AccessedTrainingRun>> {
        this.hasErrorSubject$.next(false);
        const filters = filter ? [new QueryParam('title', filter)] : [];
        pagination.size = Number.MAX_SAFE_INTEGER;
        return this.trainingApi.getAccessed(pagination, filters).pipe(
            tap(
                (runs) => {
                    this.resourceSubject$.next(runs);
                },
                (err) => {
                    this.errorHandler.emitAPIError(
                        err,
                        'Fetching training runs',
                    );
                    this.hasErrorSubject$.next(true);
                },
            ),
        );
    }

    toResumeRun(id: number): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.run.linear.runId(id).resume.build(),
            ]),
        );
    }

    toAccessRun(token: string): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.run.linear.runToken(token).access.build(),
            ]),
        );
    }

    toRunResults(id: number): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.run.linear.runId(id).results.build(),
            ]),
        );
    }

    showMitreTechniques(): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.mitre_techniques.build(),
            ]),
        );
    }
}
