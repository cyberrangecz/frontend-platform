import {
    LogOutput,
    RequestStageState,
    RequestStageType,
} from '@crczp/sandbox-model';
import { BehaviorSubject, defer, EMPTY, Observable } from 'rxjs';
import { AllocationRequestsApi } from '@crczp/sandbox-api';
import { inject, Injectable } from '@angular/core';
import {
    catchError,
    distinctUntilChanged,
    filter,
    ignoreElements,
    map,
    repeat,
    switchMap,
    tap,
} from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { StageAdapter } from '../../../model/adapters/stage-adapter';
import { NotificationService, PortalConfig } from '@crczp/utils';

/** State of a stage log before its first fetch is sent. */
export interface OutputsNotFetched {
    readonly status: 'not-fetched';
}

/** State of a stage log while its first fetch is waiting for an answer. */
export interface OutputsLoading {
    readonly status: 'loading';
}

/** State of a stage log after at least one fetch has answered. */
export interface OutputsFetched {
    readonly status: 'fetched';
    readonly content: string;
    readonly rows: number;
}

export type OutputsState = OutputsNotFetched | OutputsLoading | OutputsFetched;

export const OUTPUTS_NOT_FETCHED: OutputsNotFetched = { status: 'not-fetched' };

const OUTPUTS_LOADING: OutputsLoading = { status: 'loading' };

/** HTTP status codes of a failed outputs request: network failures, client and server errors. */
const FAILURE_STATUS_CODES = [
    0,
    ...Array.from({ length: 200 }, (_, offset) => 400 + offset),
];

/** Log text shown when the first fetch of a stage log fails. */
const FIRST_FETCH_FAILURE_TEXT = 'Failed to fetch logs';

/** Toast line naming why an outputs request failed. */
function describeFailure(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
        return 'Refreshing...';
    }
    return error.status === 0
        ? 'No response from the sandbox service. Refreshing...'
        : `HTTP ${error.status} from the sandbox service. Refreshing...`;
}

@Injectable()
export class OutputsService {
    private readonly api = inject(AllocationRequestsApi);
    private readonly config = inject(PortalConfig);
    private readonly notificationService = inject(NotificationService);
    private readonly stateSubject = new BehaviorSubject<OutputsState>(
        OUTPUTS_NOT_FETCHED,
    );
    private currentRequestId: number | null = null;
    private confirmedContent = '';
    private confirmedRows = 0;
    private isFailureReported = false;

    /** Emits the log state, starting with the not-fetched state. */
    public readonly log$: Observable<OutputsState> =
        this.stateSubject.asObservable();

    // eslint-disable-next-line @angular-eslint/prefer-inject
    constructor(private readonly stageType: RequestStageType) {}

    /**
     * Fetches the outputs of a stage once it leaves the queue, and keeps
     * fetching one answer after another while it runs. A stage that is not
     * running is fetched once per state change, which picks up the final rows.
     * The log accumulates in {@link log$}. Only the first of consecutive failed
     * fetches shows a warning toast; a failed fetch leaves the log as it is.
     *
     * @param stage$ Emits the current stage.
     * @param requestId ID of the request the stage belongs to.
     * @returns Observable that emits nothing and runs until `stage$` completes.
     */
    public pollUntilComplete(
        stage$: Observable<StageAdapter>,
        requestId: number,
    ): Observable<never> {
        return defer(() => {
            this.switchRequest(requestId);
            return stage$.pipe(
                map((stage) => stage.state),
                distinctUntilChanged(),
                filter((state) => state !== RequestStageState.QUEUED),
                switchMap((state) =>
                    state === RequestStageState.RUNNING ||
                    state === RequestStageState.RETRY
                        ? this.fetchOutputs(requestId).pipe(
                              repeat({
                                  delay: this.config.polling
                                      .pollingPeriodShortMs,
                              }),
                          )
                        : this.fetchOutputs(requestId),
                ),
                ignoreElements(),
            );
        });
    }

    private switchRequest(requestId: number): void {
        if (this.currentRequestId === requestId) {
            return;
        }
        this.currentRequestId = requestId;
        this.confirmedContent = '';
        this.confirmedRows = 0;
        this.isFailureReported = false;
        this.stateSubject.next(OUTPUTS_NOT_FETCHED);
    }

    private fetchOutputs(requestId: number): Observable<LogOutput> {
        return defer(() => {
            if (this.stateSubject.value.status === 'not-fetched') {
                this.stateSubject.next(OUTPUTS_LOADING);
            }
            return this.api.getStageOutputs(
                this.stageType,
                requestId,
                this.fetchedRows(),
                FAILURE_STATUS_CODES,
            );
        }).pipe(
            filter(() => this.currentRequestId === requestId),
            tap((output) => this.appendOutput(output)),
            catchError((error: unknown) => {
                if (this.currentRequestId === requestId) {
                    this.reportFailure(error);
                }
                return EMPTY;
            }),
        );
    }

    private fetchedRows(): number {
        return this.confirmedRows;
    }

    private appendOutput(output: LogOutput): void {
        const rowsArrived = output.rows > this.confirmedRows;
        const separator = this.confirmedContent && rowsArrived ? '\n' : '';
        this.confirmedContent += separator + output.content;
        this.confirmedRows = output.rows;
        this.isFailureReported = false;
        this.publishConfirmedLog();
    }

    /**
     * Ends the loading state with a log naming the failure, and shows a warning toast for the
     * first failure since the last successful fetch.
     */
    private reportFailure(error: unknown): void {
        if (this.stateSubject.value.status === 'loading') {
            this.stateSubject.next({
                status: 'fetched',
                content: FIRST_FETCH_FAILURE_TEXT,
                rows: 0,
            });
        }
        if (this.isFailureReported) {
            return;
        }
        this.isFailureReported = true;
        this.notificationService.emit('warning', 'Stage log refresh failed', [
            describeFailure(error),
        ]);
    }

    private publishConfirmedLog(): void {
        this.stateSubject.next({
            status: 'fetched',
            content: this.confirmedContent,
            rows: this.confirmedRows,
        });
    }
}
