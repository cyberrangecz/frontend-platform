vi.mock('@crczp/components', () => ({ LOGGING_ERROR_MARKER: '[error]' }));

import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { AllocationRequestsApi } from '@crczp/sandbox-api';
import {
    LogOutput,
    RequestStageState,
    RequestStageType,
} from '@crczp/sandbox-model';
import { provideTestPortalConfig } from '@crczp/test-utils';
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
    let stage$: Subject<StageAdapter>;
    let service: OutputsService;
    let states: OutputsState[];

    beforeEach(() => {
        vi.useFakeTimers();
        contentRequests = [];
        contentRequestOffsets = [];
        stage$ = new Subject<StageAdapter>();

        const fakeApi = {
            getStageOutputs: (
                _type: RequestStageType,
                _requestId: number,
                fromRow: number,
            ): Observable<LogOutput> => {
                const answer = new Subject<LogOutput>();
                contentRequests.push(answer);
                contentRequestOffsets.push(fromRow);
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

    it('replaces loading with the error line when the first fetch fails', () => {
        startPolling(RequestStageState.FINISHED);

        contentRequest(0).error(new Error('unavailable'));

        expect(lastState()).toEqual({
            status: 'fetched',
            content: '[error] Failed to refresh logs.',
            rows: 0,
        });
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

    it('shows one error line for repeated failed polls', () => {
        startPolling(RequestStageState.RUNNING);
        contentRequest(0).next({ content: 'a', rows: 1 } as LogOutput);
        contentRequest(0).complete();
        vi.advanceTimersByTime(POLLING_PERIOD_MS);
        contentRequest(1).error(new Error('unavailable'));
        vi.advanceTimersByTime(POLLING_PERIOD_MS);
        contentRequest(2).error(new Error('unavailable'));

        expect(lastState()).toMatchObject({
            content: 'a\n[error] Failed to refresh logs.',
            rows: 1,
        });
    });

    it('drops the error line once a later poll succeeds', () => {
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
