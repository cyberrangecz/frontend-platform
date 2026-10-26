import { UnitCancellation } from '@crczp/sandbox-model';
import { AbstractSandbox } from './abstract-sandbox';

/**
 * Unfinished allocations of a pool as the pool detail shows them.
 */
export interface AllocationCancelPreview {
    /** Allocations whose every stage still waits in the queue. */
    queued: number;
    /** Allocations with a stage that has started. */
    running: number;
}

export interface AllocationCancelConfirmation {
    title: string;
    consequences: string;
}

export interface AllocationCancelSummary {
    type: 'success' | 'warning';
    title: string;
}

/**
 * Counts the unfinished allocations among the given sandboxes, queued ones apart from started ones.
 */
export function previewAllocationCancellation(
    sandboxes: AbstractSandbox[],
): AllocationCancelPreview {
    const queued = sandboxes.filter((sandbox) => sandbox.allocationQueued()).length;
    const running = sandboxes.filter(
        (sandbox) => sandbox.allocationRunning() && !sandbox.allocationQueued(),
    ).length;
    return { queued, running };
}

/**
 * Words the confirmation of Cancel all allocations. It names every queued and running allocation of
 * the pool, whatever page shows it, and gives the count of the shown page as an aside.
 */
export function describeAllocationCancelPreview(
    poolId: number,
    preview: AllocationCancelPreview,
): AllocationCancelConfirmation {
    const shown = preview.queued + preview.running;
    const aside =
        shown === 0
            ? 'This page shows none.'
            : `This page shows ${preview.queued} queued and ${preview.running} running.`;
    return {
        title: `Cancel all allocations of pool ${poolId}?`,
        consequences: `Every queued allocation of pool ${poolId} is removed and every running build is stopped and cleaned up, on all pages. ${aside} Ready sandboxes stay.`,
    };
}

/** Words the toast of cancelling one request: a warning while the stop is still unconfirmed. */
export function summarizeRequestCancellation(
    kind: 'Allocation' | 'Cleanup',
    requestId: number,
    stopPending: boolean,
): AllocationCancelSummary {
    return stopPending
        ? {
              type: 'warning',
              title: `${kind} request ${requestId}: stop not confirmed yet`,
          }
        : { type: 'success', title: `${kind} request ${requestId} cancelled` };
}

function pluralize(count: number, singular: string): string {
    return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

/**
 * Words what Cancel all allocations did to each unit for a notification, as counts of cancelled
 * allocations, stops still pending, allocations that finished meanwhile and failures. A failure or
 * a stop still pending makes it a warning.
 */
export function summarizeAllocationCancellation(
    units: UnitCancellation[],
): AllocationCancelSummary {
    const countOf = (matches: (unit: UnitCancellation) => boolean): number =>
        units.filter(matches).length;
    const failed = countOf((unit) => unit.action === 'failed');
    const stopPending = countOf((unit) => unit.stopPending);
    const cancelled = countOf(
        (unit) =>
            (unit.action === 'removed' || unit.action === 'stopped') &&
            !unit.stopPending,
    );
    const finished = countOf((unit) => unit.action === 'skipped');
    const parts = [
        { count: cancelled, text: `${pluralize(cancelled, 'allocation')} cancelled` },
        { count: stopPending, text: `${stopPending} stop pending` },
        { count: finished, text: `${finished} already finished` },
        { count: failed, text: `${failed} failed` },
    ]
        .filter(({ count }) => count > 0)
        .map(({ text }) => text);
    return {
        type: failed > 0 || stopPending > 0 ? 'warning' : 'success',
        title: parts.length > 0 ? parts.join(', ') : 'No allocation to cancel',
    };
}
