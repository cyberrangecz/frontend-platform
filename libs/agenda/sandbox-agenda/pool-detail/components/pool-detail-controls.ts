import {
    SentinelControlItem,
    SentinelControlMenuItem,
    SentinelExpandableControlItem,
} from '@sentinel/components/controls';
import {Pool} from '@crczp/sandbox-model';
import {defer, of} from 'rxjs';
import {AbstractSandbox} from '../model/abstract-sandbox';
import {SandboxInstanceService} from '../services/state/sandbox-instance/sandbox-instance.service';

/**
 * @dynamic
 */
export class PoolDetailControls {
    static readonly ALLOCATE_SOME_ACTION_ID = 'allocate_some';
    static readonly DELETE_ACTION_ID = 'delete_menu';
    static readonly DELETE_FAILED_ACTION_ID = 'delete_failed';
    static readonly DELETE_ALL_ACTION_ID = 'delete_all';
    static readonly DELETE_UNLOCKED_ACTION_ID = 'delete_unlocked';
    static readonly CANCEL_QUEUED_ACTION_ID = 'cancel_queued';
    static readonly FORCE_CANCEL_ALLOCATION_ACTION_ID = 'force_cancel_allocation';
    static readonly FORCE_CLEANUP_ACTION_ID = 'force_cleanup';

    /**
     * @param isSandboxAdmin true if the user may force the removal of stuck sandboxes, which
     * leaves their cloud resources behind
     */
    static create(
        pool: Pool,
        sandboxes: AbstractSandbox[],
        sandboxInstanceService: SandboxInstanceService,
        isSandboxAdmin: boolean,
    ): SentinelControlItem[] {
        // The stuck sandboxes these actions remove may be on another page than the one shown, so
        // the actions stay enabled; the sandbox service removes only the ones that are stuck.
        const noSandboxShown = sandboxes.length === 0;
        const deleteActions = [
            {
                id: this.DELETE_ALL_ACTION_ID,
                label: 'Delete All',
                disabled: PoolDetailControls.someSandboxHasNoRunningCleanup(sandboxes),
                action: () => sandboxInstanceService.cleanupMultiple(pool.id, true),
                icon: 'delete',
            },
            {
                id: this.DELETE_FAILED_ACTION_ID,
                label: 'Delete Failed',
                disabled: PoolDetailControls.someSandboxFailedAndHasNoRunningCleanup(sandboxes),
                action: () => sandboxInstanceService.cleanupFailed(pool.id, true),
                icon: 'delete_forever',
            },
            {
                id: this.DELETE_UNLOCKED_ACTION_ID,
                label: 'Delete Unlocked',
                disabled: PoolDetailControls.someSandboxUnlockedAndHasNoRunningCleanup(sandboxes),
                action: () => sandboxInstanceService.cleanupUnlocked(pool.id, true),
                icon: 'delete_outline',
            },
            {
                id: this.CANCEL_QUEUED_ACTION_ID,
                label: 'Cancel Queued',
                disabled: noSandboxShown,
                action: () => sandboxInstanceService.cancelQueued(pool.id),
                icon: 'pause_circle_outline',
            },
        ];
        if (isSandboxAdmin) {
            deleteActions.push(
                {
                    id: this.FORCE_CANCEL_ALLOCATION_ACTION_ID,
                    label: 'Force Cancel Allocation',
                    disabled: noSandboxShown,
                    action: () => sandboxInstanceService.forceCancelAllocation(pool.id),
                    icon: 'cancel',
                },
                {
                    id: this.FORCE_CLEANUP_ACTION_ID,
                    label: 'Force Cleanup',
                    disabled: noSandboxShown,
                    action: () => sandboxInstanceService.forceCleanup(pool.id),
                    icon: 'delete_sweep',
                },
            );
        }
        return [
            new SentinelControlItem(
                this.ALLOCATE_SOME_ACTION_ID,
                'Allocate sandbox' + (pool.maxSize - sandboxes.length == 1 ? '' : 'es'),
                'primary',
                of(pool.maxSize === sandboxes.length),
                defer(() => sandboxInstanceService.allocateSpecified(pool.id, pool.maxSize - sandboxes.length)),
            ),
            new SentinelExpandableControlItem(
                this.DELETE_ACTION_ID,
                'Delete',
                'warn',
                // Open while any of its actions applies
                of(deleteActions.every((deleteAction) => deleteAction.disabled)),
                deleteActions.map(
                    (deleteAction) =>
                        new SentinelControlMenuItem(
                            deleteAction.id,
                            deleteAction.label,
                            'warn',
                            of(deleteAction.disabled),
                            defer(deleteAction.action),
                            deleteAction.icon,
                        ),
                ),
            ),
        ];
    }

    private static someSandboxFailedAndHasNoRunningCleanup(sandboxes: AbstractSandbox[]) {
        return !sandboxes.some((sandbox) => sandbox.allocationFailed() && !sandbox.cleanupRunning());
    }

    private static someSandboxUnlockedAndHasNoRunningCleanup(sandboxes: AbstractSandbox[]) {
        return !sandboxes.some((sandbox: AbstractSandbox) => !sandbox.locked && !sandbox.cleanupRunning());
    }

    private static someSandboxHasNoRunningCleanup(sandboxes: AbstractSandbox[]) {
        return !sandboxes.some((sandbox) => !sandbox.cleanupRunning());
    }
}
