import { TestBed } from '@angular/core/testing';
import { Pool } from '@crczp/sandbox-model';
import { PoolSort } from '@crczp/sandbox-api';
import { LoadingTracker, OffsetPaginationEvent } from '@crczp/utils';
import { firstValueFrom, Observable, of, Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PoolOverviewService } from '../pool-overview/services/state/pool-overview.service';
import { PoolService } from '../pool-overview/services/abstract-pool/abstract-sandbox/pool.service';

const FIRST_PAGE: OffsetPaginationEvent<PoolSort> = { page: 0, size: 10, sort: 'id', sortDir: 'asc' };

/**
 * Stands in for the pool overview state: the delete request and the list refresh are held open
 * by the test, and both count towards isDeleting$ the way the real service counts them.
 */
function createPoolService() {
    const tracker = new LoadingTracker();
    const deleteRequest$ = new Subject<number[]>();
    const listRefresh$ = new Subject<void>();
    const overviewService = {
        resource$: of(),
        isLoading$: of(false),
        isDeleting$: tracker.isLoading$,
        trackDeletion: <T>(request: () => Observable<T>) => tracker.trackRequest(request),
        delete: () => tracker.trackRequest(() => deleteRequest$),
        getAll: () => listRefresh$,
    };
    TestBed.configureTestingModule({
        providers: [PoolService, { provide: PoolOverviewService, useValue: overviewService }],
    });
    const poolService = TestBed.inject(PoolService);
    poolService.getAll(FIRST_PAGE);
    return { poolService, deleteRequest$, listRefresh$ };
}

describe('Pool Delete guard', () => {
    it('is idle before a delete starts', async () => {
        const { poolService } = createPoolService();

        expect(await firstValueFrom(poolService.poolsIsDeleting$)).toBe(false);
    });

    it('stays busy while the delete request is in flight', async () => {
        const { poolService } = createPoolService();

        poolService.delete(new Pool()).subscribe();

        expect(await firstValueFrom(poolService.poolsIsDeleting$)).toBe(true);
    });

    it('stays busy after the delete request ends until the pool list has refreshed', async () => {
        const { poolService, deleteRequest$, listRefresh$ } = createPoolService();
        poolService.delete(new Pool()).subscribe();

        deleteRequest$.next([]);
        deleteRequest$.complete();

        expect(await firstValueFrom(poolService.poolsIsDeleting$)).toBe(true);
        listRefresh$.next();
        listRefresh$.complete();
        expect(await firstValueFrom(poolService.poolsIsDeleting$)).toBe(false);
    });

    it('is released when the pool list refresh fails', async () => {
        const { poolService, deleteRequest$, listRefresh$ } = createPoolService();
        poolService.delete(new Pool()).subscribe({ error: () => undefined });
        deleteRequest$.next([]);
        deleteRequest$.complete();

        listRefresh$.error(new Error('refresh failed'));

        expect(await firstValueFrom(poolService.poolsIsDeleting$)).toBe(false);
    });
});
