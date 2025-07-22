import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {AdaptiveRunApi} from '@crczp/training-api';
import {AccessedTrainingRun} from '@crczp/training-model';
import {from, Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {AccessedAdaptiveRunService} from './accessed-adaptive-run.service';
import {ErrorHandlerService, PortalConfig, Routing} from '@crczp/common';

/**
 * Basic implementation of layer between component and API service.
 */
@Injectable()
export class AccessedAdaptiveRunConcreteService extends AccessedAdaptiveRunService {
    private api = inject(AdaptiveRunApi);
    private router = inject(Router);
    private errorHandler = inject(ErrorHandlerService);

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets paginated accessed training runs and updates related observables or handles error.
     * @param pagination requested pagination info
     */
    getAll(
        pagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<AccessedTrainingRun>> {
        this.hasErrorSubject$.next(false);
        return this.api.getAccessed(pagination).pipe(
            tap(
                (trainingRuns) => {
                    this.resourceSubject$.next(trainingRuns);
                },
                (err) => {
                    this.errorHandler.emit(err, 'Fetching adaptive runs');
                    this.hasErrorSubject$.next(true);
                }
            )
        );
    }

    /**
     * Resumes in already started adaptive run or handles error.
     * @param id id of adaptive run to resume
     */
    resume(id: number): Observable<any> {
        return from(
            this.router.navigate([Routing.RouteBuilder.run.adaptive.runId(id).resume.build()])
        );
    }

    access(token: string): Observable<any> {
        return from(
            this.router.navigate([Routing.RouteBuilder.run.adaptive.runToken(token).access.build()])
        );
    }

    results(id: number): Observable<any> {
        return from(
            this.router.navigate([Routing.RouteBuilder.run.adaptive.runId(id).results.build()])
        );
    }
}
