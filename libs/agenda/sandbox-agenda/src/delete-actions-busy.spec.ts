import { SentinelExpandableControlItem } from '@sentinel/components/controls';
import { Pool } from '@crczp/sandbox-model';
import { BusyGuard } from '@crczp/sandbox-agenda/internal';
import { firstValueFrom, isObservable, of, Subject, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PoolDetailControls } from '../pool-detail/components/pool-detail-controls';
import { AbstractSandbox } from '../pool-detail/model/abstract-sandbox';
import { SandboxAllocationUnitsService } from '../pool-detail/services/state/sandbox-allocation-unit/sandbox-allocation-units.service';
import { SandboxInstanceService } from '../pool-detail/services/state/sandbox-instance/sandbox-instance.service';

class TrackingUnitsService extends (SandboxAllocationUnitsService as unknown as new () => Pick<
    SandboxAllocationUnitsService,
    'isDeleting$' | 'trackDeletion'
>) {}

function createSandbox(): AbstractSandbox {
    return new AbstractSandbox({
        id: 1,
        comment: '',
        locked: false,
        sandboxUuid: '',
        poolId: 7,
        createdBy: { fullName: 'Organizer' },
        allocationRequest: { createdAt: new Date(), stages: [] },
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

function createDeleteMenu(unitsService: TrackingUnitsService) {
    const service = {
        isDeleting$: unitsService.isDeleting$,
    } as unknown as SandboxInstanceService;
    const controls = createControls(
        createPool(),
        [createSandbox()],
        service,
    );
    return controls[1] as SentinelExpandableControlItem;
}

function readDisabled(disabled: SentinelExpandableControlItem['disabled$']): Promise<boolean> {
    return firstValueFrom(isObservable(disabled) ? disabled : of(disabled()));
}

async function disabledStates(unitsService: TrackingUnitsService) {
    const menu = createDeleteMenu(unitsService);
    return Promise.all(
        [menu, ...menu.children].map((control) =>
            readDisabled(control.disabled$),
        ),
    );
}

describe('Delete actions while a delete request is in flight', () => {
    it('keep their idle state while no delete request runs', async () => {
        expect(await disabledStates(new TrackingUnitsService())).toEqual([
            false,
            false,
            true,
            false,
        ]);
    });

    it('are all disabled while a delete request is in flight', async () => {
        const unitsService = new TrackingUnitsService();
        unitsService
            .trackDeletion(() => new Subject<void>())
            .subscribe({ error: () => undefined });

        expect(await disabledStates(unitsService)).toEqual([
            true,
            true,
            true,
            true,
        ]);
    });

    it('return to their idle state after the request succeeds', async () => {
        const unitsService = new TrackingUnitsService();
        const request$ = new Subject<void>();
        unitsService.trackDeletion(() => request$).subscribe();
        request$.next();
        request$.complete();

        expect(await disabledStates(unitsService)).toEqual([
            false,
            false,
            true,
            false,
        ]);
    });

    it('return to their idle state after the request fails', async () => {
        const unitsService = new TrackingUnitsService();
        unitsService
            .trackDeletion(() => throwError(() => new Error('failed')))
            .subscribe({ error: () => undefined });

        expect(await disabledStates(unitsService)).toEqual([
            false,
            false,
            true,
            false,
        ]);
    });

    it('stay disabled until every overlapping request has ended', async () => {
        const unitsService = new TrackingUnitsService();
        const first$ = new Subject<void>();
        const second$ = new Subject<void>();
        unitsService.trackDeletion(() => first$).subscribe();
        unitsService.trackDeletion(() => second$).subscribe();
        first$.complete();

        expect(await firstValueFrom(unitsService.isDeleting$)).toBe(true);

        second$.complete();

        expect(await firstValueFrom(unitsService.isDeleting$)).toBe(false);
    });

    it('keep a control disabled that no request enables', async () => {
        const unitsService = new TrackingUnitsService();
        const service = {
            isDeleting$: unitsService.isDeleting$,
        } as unknown as SandboxInstanceService;
        const [, deleteMenu] = createControls(createPool(), [], service);

        expect(
            await readDisabled((deleteMenu as SentinelExpandableControlItem).disabled$),
        ).toBe(true);
    });
});
