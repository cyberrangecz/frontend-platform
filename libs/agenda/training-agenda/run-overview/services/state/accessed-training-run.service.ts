import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AccessedTrainingRunSort, LinearRunApi } from '@crczp/training-api';
import { AccessedTrainingRun, TraineeSandbox } from '@crczp/training-model';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { BehaviorSubject, EMPTY, from, Observable, of, Subject, timer } from 'rxjs';
import { catchError, expand, filter, map, startWith, switchMap, tap } from 'rxjs/operators';
import { OffsetPaginationEvent } from '@crczp/utils';
import { ErrorHandlerService, LoadingTracker, NotificationService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import {
    CrczpOffsetElementsPaginatedService,
    OffsetPaginatedResource,
    QueryParam,
} from '@crczp/api-common';

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
    private dialog = inject(MatDialog);
    private errorHandler = inject(ErrorHandlerService);
    private notificationService = inject(NotificationService);
    private readonly loadingTracker = new LoadingTracker();
    private readonly config = inject(PortalConfig);
    private readonly ownSandboxesSubject$ = new BehaviorSubject<TraineeSandbox[]>([]);
    private readonly ownSandboxesRefresh$ = new Subject<void>();

    override isLoading$ = this.loadingTracker.isLoading$;

    /** The sandboxes the trainee allocated for themselves */
    ownSandboxes$ = this.ownSandboxesSubject$.asObservable();

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Keeps the sandboxes the trainee allocated for themselves up to date, polling while any of
     * them is being built or removed. Lists none where trainees do not allocate sandboxes.
     */
    watchOwnSandboxes(): Observable<TraineeSandbox[]> {
        if (!this.config.enableTraineeSandboxAllocation) {
            return EMPTY;
        }
        const fetch$ = this.trainingApi.getOwnSandboxes().pipe(
            // The failure has been reported; going on with the last list keeps polling while it
            // shows a sandbox being built or removed.
            catchError(() => of(this.ownSandboxesSubject$.value)),
        );
        return this.ownSandboxesRefresh$.pipe(
            startWith(undefined),
            switchMap(() =>
                fetch$.pipe(
                    expand((sandboxes) =>
                        sandboxes.some((sandbox) => sandbox.inProgress)
                            ? timer(this.config.polling.pollingPeriodLongMs).pipe(
                                  switchMap(() => fetch$),
                              )
                            : EMPTY,
                    ),
                ),
            ),
            tap((sandboxes) => this.ownSandboxesSubject$.next(sandboxes)),
        );
    }

    refreshOwnSandboxes(): void {
        this.ownSandboxesRefresh$.next();
    }

    /**
     * Asks the trainee to confirm, then requests the removal of a sandbox they allocated for
     * themselves.
     * @param sandbox the sandbox to remove
     */
    removeOwnSandbox(sandbox: TraineeSandbox): Observable<void> {
        return this.dialog
            .open(SentinelConfirmationDialogComponent, {
                data: new SentinelConfirmationDialogConfig(
                    'Remove Sandbox',
                    `Do you want to remove your sandbox${sandbox.trainingInstanceTitle ? ` of "${sandbox.trainingInstanceTitle}"` : ''}? Everything you did in it will be lost.`,
                    'Cancel',
                    'Remove',
                ),
            })
            .afterClosed()
            .pipe(
                filter((result) => result === SentinelDialogResultEnum.CONFIRMED),
                switchMap(() => this.trainingApi.removeOwnSandbox(sandbox.id)),
                tap({
                    next: () => {
                        this.notificationService.emit(
                            'success',
                            'Sandbox removal requested',
                        );
                        this.refreshOwnSandboxes();
                    },
                    error: (err) =>
                        this.errorHandler.emitAPIError(err, 'Removing sandbox'),
                }),
            );
    }

    /**
     * Gets paginated accessed training runs and updates related observables or handles error.
     * @param pagination requested pagination info
     * @param filter filters to be applied on resources
     */
    getAll(
        pagination: OffsetPaginationEvent<AccessedTrainingRunSort>,
        filter?: string,
    ): Observable<OffsetPaginatedResource<AccessedTrainingRun>> {
        this.hasErrorSubject$.next(false);
        const filters = filter ? [new QueryParam('title', filter)] : [];
        return this.loadingTracker.trackRequest(() =>
            this.trainingApi.getAccessed(pagination, filters).pipe(
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

    /**
     * Navigates to the access route with the whole token as one route parameter,
     * whatever characters it holds.
     */
    toAccessRun(token: string): Observable<any> {
        const encodedToken = encodeURIComponent(token).replace(
            /[()]/g,
            (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
        );
        return from(
            this.router.navigateByUrl(
                Routing.RouteBuilder.run.linear.runToken(encodedToken).access.build(),
            ),
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
