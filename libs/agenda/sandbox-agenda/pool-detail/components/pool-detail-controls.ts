import {
    SentinelControlItem,
    SentinelControlMenuItem,
    SentinelExpandableControlItem,
} from '@sentinel/components/controls';
import {Pool} from '@crczp/sandbox-model';
import {defer, of} from 'rxjs';
import {DisabledWhileBusy} from '@crczp/sandbox-agenda/internal';
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
    static readonly CANCEL_ALLOCATIONS_ACTION_ID = 'cancel_allocations';

    static create(
        pool: Pool,
        sandboxes: AbstractSandbox[],
        sandboxInstanceService: SandboxInstanceService,
        disabledWhileBusy: DisabledWhileBusy,
    ): SentinelControlItem[] {
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
        ];
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
                disabledWhileBusy(deleteActions.every((deleteAction) => deleteAction.disabled)),
                deleteActions.map(
                    (deleteAction) =>
                        new SentinelControlMenuItem(
                            deleteAction.id,
                            deleteAction.label,
                            'warn',
                            disabledWhileBusy(deleteAction.disabled),
                            defer(deleteAction.action),
                            deleteAction.icon,
                        ),
                ),
            ),
            new SentinelControlItem(
                this.CANCEL_ALLOCATIONS_ACTION_ID,
                'Cancel all allocations',
                'warn',
                // Units on another page may still be building, so only an empty pool disables it.
                disabledWhileBusy(sandboxes.length === 0),
                defer(() => sandboxInstanceService.cancelAllocations(pool.id)),
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
