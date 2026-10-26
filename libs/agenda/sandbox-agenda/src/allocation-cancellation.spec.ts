import { UnitCancellation, UnitCancellationAction } from '@crczp/sandbox-model';
import { describe, expect, it } from 'vitest';
import { RequestStageState } from '@crczp/sandbox-model';
import { AbstractSandbox } from '../pool-detail/model/abstract-sandbox';
import {
    describeAllocationCancelPreview,
    summarizeAllocationCancellation,
    previewAllocationCancellation,
    summarizeRequestCancellation,
} from '../pool-detail/model/allocation-cancellation';

function createUnit(
    action: UnitCancellationAction,
    overrides: Partial<UnitCancellation> = {},
): UnitCancellation {
    return Object.assign(new UnitCancellation(), {
        unitId: 1,
        stackName: 'stack-1',
        action,
        stopPending: false,
        reason: '',
        ...overrides,
    });
}

describe('describeAllocationCancelPreview', () => {
    it('names every allocation of the pool and gives the shown counts as an aside', () => {
        expect(describeAllocationCancelPreview(4, { queued: 3, running: 2 })).toEqual({
            title: 'Cancel all allocations of pool 4?',
            consequences:
                'Every queued allocation of pool 4 is removed and every running build is stopped and cleaned up, on all pages. This page shows 3 queued and 2 running. Ready sandboxes stay.',
        });
    });

    it('still names the whole pool when the shown page has no unfinished allocation', () => {
        const confirmation = describeAllocationCancelPreview(4, { queued: 0, running: 0 });

        expect(confirmation.title).toBe('Cancel all allocations of pool 4?');
        expect(confirmation.consequences).toContain('Every queued allocation of pool 4');
        expect(confirmation.consequences).toContain('This page shows none.');
    });
});

function createSandbox(allocationStages: RequestStageState[]): AbstractSandbox {
    return new AbstractSandbox({
        id: 1,
        comment: '',
        locked: false,
        sandboxUuid: '',
        poolId: 7,
        createdBy: { fullName: 'Organizer' },
        allocationRequest: { createdAt: new Date(), stages: allocationStages },
        cleanupRequest: null,
    } as never);
}

describe('previewAllocationCancellation', () => {
    it('counts queued and started allocations apart and skips finished ones', () => {
        const preview = previewAllocationCancellation([
            createSandbox([RequestStageState.QUEUED, RequestStageState.QUEUED]),
            createSandbox([RequestStageState.QUEUED]),
            createSandbox([RequestStageState.RUNNING, RequestStageState.QUEUED]),
            createSandbox([RequestStageState.FINISHED, RequestStageState.FINISHED]),
        ]);

        expect(preview).toEqual({ queued: 2, running: 1 });
    });
});

describe('summarizeRequestCancellation', () => {
    it('warns while the stop is not confirmed', () => {
        expect(summarizeRequestCancellation('Allocation', 12, true)).toEqual({
            type: 'warning',
            title: 'Allocation request 12: stop not confirmed yet',
        });
    });

    it('reports a confirmed stop as a success', () => {
        expect(summarizeRequestCancellation('Allocation', 12, false)).toEqual({
            type: 'success',
            title: 'Allocation request 12 cancelled',
        });
    });

    it('names the kind of request for a cleanup', () => {
        expect(summarizeRequestCancellation('Cleanup', 5, true).title).toBe(
            'Cleanup request 5: stop not confirmed yet',
        );
    });
});

describe('summarizeAllocationCancellation', () => {
    it('counts cancelled allocations and pending stops apart', () => {
        const summary = summarizeAllocationCancellation([
            createUnit('removed'),
            createUnit('removed'),
            createUnit('stopped'),
            createUnit('stopped'),
            createUnit('stopped', { stopPending: true }),
        ]);

        expect(summary).toEqual({
            type: 'warning',
            title: '4 allocations cancelled, 1 stop pending',
        });
    });

    it('reports a clean run as a success', () => {
        expect(summarizeAllocationCancellation([createUnit('stopped')])).toEqual({
            type: 'success',
            title: '1 allocation cancelled',
        });
    });

    it('warns about a failed unit', () => {
        expect(
            summarizeAllocationCancellation([
                createUnit('removed'),
                createUnit('failed', { reason: 'queue unreachable' }),
            ]),
        ).toEqual({ type: 'warning', title: '1 allocation cancelled, 1 failed' });
    });

    it('names allocations that finished meanwhile without a warning', () => {
        expect(summarizeAllocationCancellation([createUnit('skipped')])).toEqual({
            type: 'success',
            title: '1 already finished',
        });
    });

    it('reports an empty answer', () => {
        expect(summarizeAllocationCancellation([]).title).toBe('No allocation to cancel');
    });
});
