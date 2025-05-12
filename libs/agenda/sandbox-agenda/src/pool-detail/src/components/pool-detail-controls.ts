import {
    SentinelControlItem,
    SentinelControlMenuItem,
    SentinelExpandableControlItem,
} from '@sentinel/components/controls';
import { Pool } from '@crczp/sandbox-model';
import { defer, of } from 'rxjs';
import { AbstractSandbox } from '../model/abstract-sandbox';
import { SandboxInstanceService } from '../services/state/sandbox-instance/sandbox-instance.service';

/**
 * @dynamic
 */
export class PoolDetailControls {
    static readonly ALLOCATE_ALL_ACTION_ID = 'allocate_all';
    static readonly ALLOCATE_SOME_ACTION_ID = 'allocate_some';
    static readonly DELETE_ACTION_ID = 'delete_menu';
    static readonly DELETE_FAILED_ACTION_ID = 'delete_failed';
    static readonly DELETE_ALL_ACTION_ID = 'delete_all';
    static readonly DELETE_UNLOCKED_ACTION_ID = 'delete_unlocked';

    static create(
        pool: Pool,
        sandboxes: AbstractSandbox[],
        sandboxInstanceService: SandboxInstanceService,
    ): SentinelControlItem[] {
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
                of(PoolDetailControls.someSandboxHasNoRunningCleanup(sandboxes)),
                [
                    new SentinelControlMenuItem(
                        this.DELETE_ALL_ACTION_ID,
                        'Delete All',
                        'warn',
                        of(PoolDetailControls.someSandboxHasNoRunningCleanup(sandboxes)),
                        defer(() => sandboxInstanceService.cleanupMultiple(pool.id, true)),
                        'delete',
                    ),
                    new SentinelControlMenuItem(
                        this.DELETE_FAILED_ACTION_ID,
                        'Delete Failed',
                        'warn',
                        of(PoolDetailControls.someSandboxFailedAndHasNoRunningCleanup(sandboxes)),
                        defer(() => sandboxInstanceService.cleanupFailed(pool.id, true)),
                        'delete_forever',
                    ),
                    new SentinelControlMenuItem(
                        this.DELETE_UNLOCKED_ACTION_ID,
                        'Delete Unlocked',
                        'warn',
                        of(PoolDetailControls.someSandboxUnlockedAndHasNoRunningCleanup(sandboxes)),
                        defer(() => sandboxInstanceService.cleanupUnlocked(pool.id, true)),
                        'delete_outline',
                    ),
                ],
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
