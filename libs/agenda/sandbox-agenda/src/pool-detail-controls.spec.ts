import { SentinelExpandableControlItem } from '@sentinel/components/controls';
import { Pool, RequestStageState } from '@crczp/sandbox-model';
import { BusyGuard } from '@crczp/sandbox-agenda/internal';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PoolDetailControls } from '../pool-detail/components/pool-detail-controls';
import { AbstractSandbox } from '../pool-detail/model/abstract-sandbox';
import { SandboxInstanceService } from '../pool-detail/services/state/sandbox-instance/sandbox-instance.service';

function createSandbox(allocationStages: RequestStageState[]): AbstractSandbox {
    return new AbstractSandbox({
        id: 1,
        comment: '',
        locked: false,
        sandboxUuid: '',
        poolId: 7,
        createdBy: { fullName: 'Organizer' },
        allocationRequest: {
            createdAt: new Date(),
            stages: allocationStages,
        },
        cleanupRequest: null,
    } as never);
}

function createControls(
    pool: Pool,
    sandboxes: AbstractSandbox[],
    service: SandboxInstanceService,
) {
    return PoolDetailControls.create(
        pool,
        sandboxes,
        service,
        new BusyGuard(service.isDeleting$).renew(),
    );
}

function createPool(): Pool {
    const pool = new Pool();
    pool.id = 7;
    pool.maxSize = 4;
    return pool;
}

function createService() {
    return {
        isDeleting$: of(false),
        cancelAllocations: vi.fn(() => of(undefined)),
    } as unknown as SandboxInstanceService & {
        cancelAllocations: ReturnType<typeof vi.fn>;
    };
}

describe('PoolDetailControls', () => {
    it('lists Allocate, the Delete menu and Cancel all allocations in order', () => {
        const controls = createControls(createPool(), [], createService());

        expect(controls.map((control) => control.id)).toEqual([
            PoolDetailControls.ALLOCATE_SOME_ACTION_ID,
            PoolDetailControls.DELETE_ACTION_ID,
            PoolDetailControls.CANCEL_ALLOCATIONS_ACTION_ID,
        ]);
        expect(controls.map((control) => control.labelSig())).toEqual([
            'Allocate sandboxes',
            'Delete',
            'Cancel all allocations',
        ]);
    });

    it('offers Delete all, Delete failed and Delete unlocked in the Delete menu', () => {
        const controls = createControls(createPool(), [], createService());
        const deleteMenu = controls[1] as SentinelExpandableControlItem;

        expect(deleteMenu.children.map((child) => ('id' in child ? child.id : undefined))).toEqual([
            PoolDetailControls.DELETE_ALL_ACTION_ID,
            PoolDetailControls.DELETE_FAILED_ACTION_ID,
            PoolDetailControls.DELETE_UNLOCKED_ACTION_ID,
        ]);
    });

    it('offers no force action', () => {
        const controls = createControls(createPool(), [], createService());
        const deleteMenu = controls[1] as SentinelExpandableControlItem;
        const labels = [...controls, ...deleteMenu.children].map((control) =>
            'id' in control ? String(control.id) : '',
        );

        expect(labels.some((id) => id.includes('force') || id.includes('queued'))).toBe(false);
    });

    it('disables Cancel all allocations while no unit is shown', async () => {
        const controls = createControls(createPool(), [], createService());
        const disabled = controls[2].disabled$;

        expect(await firstValueFrom(isObservable(disabled) ? disabled : of(disabled()))).toBe(true);
    });

    it('asks the service to cancel the allocations of the pool', async () => {
        const service = createService();
        const controls = createControls(
            createPool(),
            [createSandbox([RequestStageState.RUNNING])],
            service,
        );

        await firstValueFrom(controls[2].result$);

        expect(service.cancelAllocations).toHaveBeenCalledWith(7);
    });
});
