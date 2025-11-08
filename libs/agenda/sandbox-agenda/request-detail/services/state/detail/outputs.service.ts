import {
    LogOutput,
    RequestStageState,
    RequestStageType,
} from '@crczp/sandbox-model';
import { BehaviorSubject, defer, EMPTY, Observable } from 'rxjs';
import { AllocationRequestsApi } from '@crczp/sandbox-api';
import { inject, Injectable } from '@angular/core';
import {
    delay,
    distinctUntilChanged,
    filter,
    finalize,
    map,
    repeat,
    switchMap,
    takeWhile,
    tap,
} from 'rxjs/operators';
import { StageAdapter } from '../../../model/adapters/stage-adapter';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class OutputsService {
    private api = inject(AllocationRequestsApi);
    private config = inject(PortalConfig);

    private logsSubject = new BehaviorSubject<LogOutput>({
        content: '',
        rows: 0,
    });

    public log$ = this.logsSubject
        .asObservable()
        .pipe(map((log) => log.content));

    private currentRequestId: number | null = null;
    private isPolling = false;
    private isFetching = false;

    // eslint-disable-next-line @angular-eslint/prefer-inject
    constructor(private stageType: RequestStageType) {}

    /**
     * Polls the outputs of a given stage until it is complete (or failed).
     *
     * Gradually fetches and appends logs to the logsSubject.
     * Each emission contains the full log content so far.
     *
     * @param stage$ Observable emitting the current stage status
     * @param requestId ID of the request
     * @returns Observable emitting the full log content as a string
     */
    public pollUntilComplete(
        stage$: Observable<StageAdapter>,
        requestId: number,
    ): Observable<string> {
        // If switching to a new request, reset the logs
        if (this.currentRequestId !== requestId) {
            this.currentRequestId = requestId;
            this.logsSubject.next({ content: '', rows: 0 });
            this.isPolling = false;
        }

        const pollingPeriod = this.config.polling.pollingPeriodShort;

        // Create observable that only emits when state changes
        const state$ = stage$.pipe(
            map((stage) => {
                return stage.state;
            }),
            distinctUntilChanged(),
        );

        return state$.pipe(
            filter((state) => state !== RequestStageState.QUEUED),
            switchMap((state) => {
                // If RUNNING, start periodic polling
                if (state === RequestStageState.RUNNING) {
                    if (!this.isPolling) {
                        this.isPolling = true;
                    }

                    // Use defer to create a new observable for each poll cycle
                    // The delay will only start AFTER the API call completes
                    return defer(() =>
                        this.fetchOutputsObservable(requestId),
                    ).pipe(
                        delay(pollingPeriod),
                        repeat(), // Repeat (used like this to start next poll only after previous finishes)
                        takeWhile(() => this.isPolling), // Stop when isPolling becomes false
                        switchMap(() => this.log$),
                    );
                }

                this.isPolling = false;

                // Fetch once for non-running states if not yet fetched
                if (this.logsSubject.value.rows === 0) {
                    this.fetchOutputs(requestId);
                }

                return this.log$;
            }),
        );
    }

    private fetchOutputs(requestId: number): void {
        // Additional safeguard for duplicate requests
        if (this.isFetching) {
            return;
        }

        this.isFetching = true;
        this.api
            .getStageOutputs(
                this.stageType,
                requestId,
                this.logsSubject.value.rows,
            )
            .subscribe({
                next: (logs) => {
                    this.appendOutput(logs);
                    this.isFetching = false;
                },
                error: () => {
                    this.appendOutput({
                        content: '[LOGGING ERROR]: Failed to refresh logs.\n',
                        rows: this.logsSubject.value.rows,
                    });
                    this.isFetching = false;
                },
            });
    }

    private fetchOutputsObservable(requestId: number): Observable<LogOutput> {
        // Additional safeguard for duplicate requests
        if (this.isFetching) {
            return EMPTY;
        }

        this.isFetching = true;
        return this.api
            .getStageOutputs(
                this.stageType,
                requestId,
                this.logsSubject.value.rows,
            )
            .pipe(
                tap({
                    next: (logs) => {
                        this.appendOutput(logs);
                        this.isFetching = false;
                    },
                    error: () => {
                        this.appendOutput({
                            content:
                                '[LOGGING ERROR]: Failed to refresh logs.\n',
                            rows: this.logsSubject.value.rows,
                        });
                        this.isFetching = false;
                    },
                }),
                finalize(() => {
                    this.isFetching = false;
                }),
            );
    }

    private appendOutput(output: LogOutput): void {
        this.logsSubject.next({
            content: this.logsSubject.value.content + output.content,
            rows: output.rows,
        });
    }
}
