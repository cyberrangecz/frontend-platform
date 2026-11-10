import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { AllocationRequestsApi } from '@crczp/sandbox-api';
import {
    LogOutput,
    RequestStageState,
    RequestStageType,
} from '@crczp/sandbox-model';
import { provideTestPortalConfig } from '@crczp/test-utils';
import { NotificationService } from '@crczp/utils';
import { OutputsService, OutputsState } from '../request-detail/services/state/detail/outputs.service';
import { StageAdapter } from '../request-detail/model/adapters/stage-adapter';

const POLLING_PERIOD_MS = 1000;
const REQUEST_ID = 7;

function stageInState(state: RequestStageState): StageAdapter {
    return { state } as StageAdapter;
}

describe('OutputsService', () => {
    let contentRequests: Subject<LogOutput>[];
    let contentRequestOffsets: number[];
    let contentRequestExpectedErrors: number[][];
    let stage$: Subject<StageAdapter>;
    let service: OutputsService;
    let states: OutputsState[];
    let emitNotification: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        contentRequests = [];
        contentRequestOffsets = [];
        contentRequestExpectedErrors = [];
        stage$ = new Subject<StageAdapter>();
        emitNotification = vi.fn();

        const fakeApi = {
            getStageOutputs: (
                _type: RequestStageType,
                _requestId: number,
                fromRow: number,
                expectedErrors: number[],
            ): Observable<LogOutput> => {
                const answer = new Subject<LogOutput>();
                contentRequests.push(answer);
                contentRequestOffsets.push(fromRow);
                contentRequestExpectedErrors.push(expectedErrors);
                return answer;
            },
        };

        TestBed.configureTestingModule({
            providers: [
                provideTestPortalConfig({
                    polling: { pollingPeriodShortMs: POLLING_PERIOD_MS },
                }),
                { provide: AllocationRequestsApi, useValue: fakeApi },
                {
                    provide: NotificationService,
                    useValue: { emit: emitNotification },
                },
                {
                    provide: OutputsService,
                    useFactory: () =>
                        new OutputsService(
                            RequestStageType.TERRAFORM_ALLOCATION,
                        ),
                },
            ],
        });
        service = TestBed.inject(OutputsService);
        states = [];
        service.log$.subscribe((state) => states.push(state));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function contentRequest(index: number): Subject<LogOutput> {
        const request = contentRequests[index];
        if (!request) {
            throw new Error(`No content request ${index}`);
        }
        return request;
    }

    const lastState = (): OutputsState => states.at(-1) as OutputsState;

    function startPolling(
        state: RequestStageState,
        requestId = REQUEST_ID,
    ): void {
        service.pollUntilComplete(stage$, requestId).subscribe();
        stage$.next(stageInState(state));
    }

    it('stays not fetched and sends nothing while the stage is queued', () => {
        startPolling(RequestStageState.QUEUED);

        expect(contentRequests).toHaveLength(0);
        expect(lastState().status).toBe('not-fetched');
    });

    it('is loading while the first fetch waits for its answer', () => {
        startPolling(RequestStageState.FINISHED);

        expect(contentRequests).toHaveLength(1);
        expect(states.slice(-2).map(({ status }) => status)).toEqual([
            'not-fetched',
            'loading',
        ]);
    });

    it('replaces loading with the first answer', () => {
        startPolling(RequestStageState.FINISHED);

        contentRequest(0).next({ content: 'a', rows: 1 } as LogOutput);

        expect(lastState()).toEqual({
            status: 'fetched',
            content: 'a',
            rows: 1,
        });
    });

    it('replaces loading with an empty log when the stage has no rows', () => {
        startPolling(RequestStageState.FINISHED);

        contentRequest(0).next({ content: '', rows: 0 } as LogOutput);

        expect(lastState()).toEqual({
            status: 'fetched',
            content: '',
            rows: 0,
        });
    });

    it('replaces loading with the failure text and a warning toast when the first fetch fails', () => {
        startPolling(RequestStageState.FINISHED);

        contentRequest(0).error(new HttpErrorResponse({ status: 503 }));

        expect(lastState()).toEqual({
            status: 'fetched',
            content: 'Failed to fetch logs',
            rows: 0,
        });
        expect(emitNotification).toHaveBeenCalledExactlyOnceWith(
            'warning',
            'Stage log refresh failed',
            ['HTTP 503 from the sandbox service. Refreshing...'],
        );
    });

    it('replaces the failure text with the first answer of a later poll', () => {
        startPolling(RequestStageState.RUNNING);
        contentRequest(0).error(new Error('unavailable'));
        vi.advanceTimersByTime(POLLING_PERIOD_MS);

        contentRequest(1).next({ content: 'a', rows: 1 } as LogOutput);

        expect(lastState()).toEqual({
            status: 'fetched',
            content: 'a',
            rows: 1,
        });
    });

    it('names a missing response in the warning toast', () => {
        startPolling(RequestStageState.FINISHED);

        contentRequest(0).error(new HttpErrorResponse({ status: 0 }));

        expect(emitNotification).toHaveBeenCalledExactlyOnceWith(
            'warning',
            'Stage log refresh failed',
            ['No response from the sandbox service. Refreshing...'],
        );
    });

    it('stays loading when the stage changes state before the first answer', () => {
        startPolling(RequestStageState.RUNNING);

        stage$.next(stageInState(RequestStageState.FINISHED));

        expect(contentRequest(0).observed).toBe(false);
        expect(lastState().status).toBe('loading');
        contentRequest(1).next({ content: 'a', rows: 1 } as LogOutput);
        expect(lastState()).toMatchObject({ status: 'fetched', content: 'a' });
    });

    it('never returns to loading on later polls and appends their rows', () => {
        startPolling(RequestStageState.RUNNING);
        contentRequest(0).next({ content: 'a', rows: 1 } as LogOutput);
        contentRequest(0).complete();

        vi.advanceTimersByTime(POLLING_PERIOD_MS);

        expect(contentRequests).toHaveLength(2);
        expect(contentRequestOffsets).toEqual([0, 1]);
        expect(lastState().status).toBe('fetched');
        contentRequest(1).next({ content: 'b', rows: 2 } as LogOutput);
        expect(lastState()).toEqual({
            status: 'fetched',
            content: 'a\nb',
            rows: 2,
        });
        expect(states.filter(({ status }) => status === 'loading')).toHaveLength(1);
    });

    it('never returns to loading for a stage detail recreated after the fetch', () => {
        startPolling(RequestStageState.FINISHED);
        contentRequest(0).next({ content: 'a', rows: 1 } as LogOutput);
        contentRequest(0).complete();

        const recreatedStage$ = new Subject<StageAdapter>();
        service.pollUntilComplete(recreatedStage$, REQUEST_ID).subscribe();
        recreatedStage$.next(stageInState(RequestStageState.FINISHED));

        expect(contentRequests).toHaveLength(2);
        expect(lastState().status).toBe('fetched');
    });

    it('leaves the log unchanged on failed polls', () => {
        startPolling(RequestStageState.RUNNING);
        contentRequest(0).next({ content: 'a', rows: 1 } as LogOutput);
        contentRequest(0).complete();
        const statesBeforeFailures = states.length;
        vi.advanceTimersByTime(POLLING_PERIOD_MS);
        contentRequest(1).error(new Error('unavailable'));
        vi.advanceTimersByTime(POLLING_PERIOD_MS);
        contentRequest(2).error(new Error('unavailable'));

        expect(states).toHaveLength(statesBeforeFailures);
        expect(lastState()).toEqual({
            status: 'fetched',
            content: 'a',
            rows: 1,
        });
    });

    it('appends the next answer directly after failed polls', () => {
        startPolling(RequestStageState.RUNNING);
        contentRequest(0).next({ content: 'a', rows: 1 } as LogOutput);
        contentRequest(0).complete();
        vi.advanceTimersByTime(POLLING_PERIOD_MS);
        contentRequest(1).error(new Error('unavailable'));
        vi.advanceTimersByTime(POLLING_PERIOD_MS);

        contentRequest(2).next({ content: 'b', rows: 2 } as LogOutput);

        expect(lastState()).toEqual({
            status: 'fetched',
            content: 'a\nb',
            rows: 2,
        });
    });

    it('keeps every failed fetch away from the error dialog', () => {
        startPolling(RequestStageState.RUNNING);
        contentRequest(0).error(new Error('unavailable'));
        vi.advanceTimersByTime(POLLING_PERIOD_MS);

        expect(contentRequestExpectedErrors).toHaveLength(2);
        for (const expectedErrors of contentRequestExpectedErrors) {
            expect(expectedErrors).toEqual(
                expect.arrayContaining([0, 400, 404, 500, 503, 599]),
            );
        }
    });

    it('shows one warning toast per streak of failed polls', () => {
        startPolling(RequestStageState.RUNNING);
        contentRequest(0).next({ content: 'a', rows: 1 } as LogOutput);
        contentRequest(0).complete();
        vi.advanceTimersByTime(POLLING_PERIOD_MS);
        contentRequest(1).error(new Error('unavailable'));
        vi.advanceTimersByTime(POLLING_PERIOD_MS);
        contentRequest(2).error(new Error('unavailable'));

        expect(emitNotification).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(POLLING_PERIOD_MS);
        contentRequest(3).next({ content: 'b', rows: 2 } as LogOutput);
        contentRequest(3).complete();
        vi.advanceTimersByTime(POLLING_PERIOD_MS);
        contentRequest(4).error(new Error('unavailable'));

        expect(emitNotification).toHaveBeenCalledTimes(2);
        expect(emitNotification).toHaveBeenLastCalledWith(
            'warning',
            'Stage log refresh failed',
            ['Refreshing...'],
        );
    });

    it('shows a warning toast for the first failed poll of a new request', () => {
        startPolling(RequestStageState.RUNNING, 1);
        contentRequest(0).error(new Error('unavailable'));

        startPolling(RequestStageState.RUNNING, 2);
        contentRequest(1).error(new Error('unavailable'));

        expect(emitNotification).toHaveBeenCalledTimes(2);
    });

    it('polls a stage in retry', () => {
        startPolling(RequestStageState.RETRY);
        contentRequest(0).next({ content: 'a', rows: 1 } as LogOutput);
        contentRequest(0).complete();

        vi.advanceTimersByTime(POLLING_PERIOD_MS);

        expect(contentRequests).toHaveLength(2);
    });

    it('resets for a new request on subscription, not on call', () => {
        startPolling(RequestStageState.FINISHED, 1);
        contentRequest(0).next({ content: 'a', rows: 1 } as LogOutput);

        const pending$ = service.pollUntilComplete(stage$, 2);

        expect(lastState().status).toBe('fetched');
        pending$.subscribe();
        expect(lastState().status).toBe('not-fetched');
    });
});
