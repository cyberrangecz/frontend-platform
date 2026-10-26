import { SentinelExpandableControlItem } from '@sentinel/components/controls';
import { Pool } from '@crczp/sandbox-model';
import { BusyGuard } from '@crczp/sandbox-agenda/internal';
import { Observable } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PoolDetailControls } from '../pool-detail/components/pool-detail-controls';
import { SandboxInstanceService } from '../pool-detail/services/state/sandbox-instance/sandbox-instance.service';

function createBusySource() {
    let activeSubscriptions = 0;
    const busy$ = new Observable<boolean>((subscriber) => {
        activeSubscriptions++;
        subscriber.next(false);
        return () => {
            activeSubscriptions--;
        };
    });
    return { busy$, activeSubscriptions: () => activeSubscriptions };
}

function createPool(): Pool {
    const pool = new Pool();
    pool.id = 7;
    pool.maxSize = 4;
    return pool;
}

function buildAndSubscribeLikeSentinel(guard: BusyGuard, busy$: Observable<boolean>) {
    const service = { isDeleting$: busy$ } as unknown as SandboxInstanceService;
    const controls = PoolDetailControls.create(createPool(), [], service, guard.renew());
    const deleteMenu = controls[1] as SentinelExpandableControlItem;
    [deleteMenu, ...deleteMenu.children].forEach((control) =>
        (control.disabled$ as Observable<boolean>).subscribe(),
    );
}

describe('Busy subscription of rebuilt pool detail controls', () => {
    it('leaves no subscription behind from a replaced build of the controls', () => {
        const { busy$, activeSubscriptions } = createBusySource();
        const guard = new BusyGuard(busy$);

        buildAndSubscribeLikeSentinel(guard, busy$);
        buildAndSubscribeLikeSentinel(guard, busy$);
        buildAndSubscribeLikeSentinel(guard, busy$);

        // Only the last build is alive: its parent Delete and 3 menu items.
        expect(activeSubscriptions()).toBe(4);
    });

    it('leaves no subscription behind once the guard is released', () => {
        const { busy$, activeSubscriptions } = createBusySource();
        const guard = new BusyGuard(busy$);

        buildAndSubscribeLikeSentinel(guard, busy$);
        guard.release();

        expect(activeSubscriptions()).toBe(0);
    });
});
