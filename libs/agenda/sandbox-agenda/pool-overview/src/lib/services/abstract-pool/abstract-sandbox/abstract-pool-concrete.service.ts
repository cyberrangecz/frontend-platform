import { Injectable, inject } from '@angular/core';
import {Observable} from 'rxjs';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {switchMap} from 'rxjs/operators';
import {Pool} from '@crczp/sandbox-model';
import {PoolOverviewService} from '../../state/pool-overview/pool-overview.service';
import {AbstractPoolService} from './abstract-pool.service';
import {SandboxInstanceService} from '@crczp/sandbox-agenda/pool-detail';

@Injectable()
export class AbstractPoolConcreteService extends AbstractPoolService {
    private poolOverviewService = inject(PoolOverviewService);
    private sandboxInstanceService = inject(SandboxInstanceService);

    private lastPagination: OffsetPaginationEvent;

    constructor() {
        super();
        const poolOverviewService = this.poolOverviewService;

        this.pools$ = poolOverviewService.resource$;
        this.poolsHasError$ = poolOverviewService.hasError$;
    }

    /**
     * Gets all pools with passed pagination.
     * @param pagination requested pagination
     */
    getAll(pagination: OffsetPaginationEvent): Observable<any> {
        this.lastPagination = pagination;
        return this.poolOverviewService.getAll(pagination);
    }

    /**
     * Starts a sandbox instance allocation, informs about the result and updates list of pools or handles an error
     * @param pool a pool to be allocated with sandbox instances
     * @param count number of sandbox instances to be allocated
     */
    allocate(pool: Pool, count: number): Observable<any> {
        return this.poolOverviewService.allocate(pool, count).pipe(switchMap(() => this.getAll(this.lastPagination)));
    }

    /**
     * Starts an allocation of specified number of sandboxes for a sandbox instance
     * @param pool a pool to be allocated
     * @param total number of sandboxes that are left to allocate
     */
    allocateSpecified(pool: Pool, total: number) {
        return this.sandboxInstanceService.allocateSpecified(pool.id, total);
    }

    /**
     * Deletes a pool, informs about the result and updates list of pools or handles an error
     * @param pool a pool to be deleted
     */
    delete(pool: Pool): Observable<any> {
        return this.poolOverviewService.delete(pool).pipe(switchMap(() => this.getAll(this.lastPagination)));
    }

    /**
     * Clears a pool by deleting all associated sandbox instances, informs about the result and updates list of pools or handles an error
     * @param pool a pool to be cleared
     */
    clear(pool: Pool): Observable<any> {
        return this.poolOverviewService.clear(pool).pipe(switchMap(() => this.getAll(this.lastPagination)));
    }

    create(): Observable<any> {
        return this.poolOverviewService.create().pipe(switchMap(() => this.getAll(this.lastPagination)));
    }

    lock(pool: Pool): Observable<any> {
        return this.poolOverviewService.lock(pool).pipe(switchMap(() => this.getAll(this.lastPagination)));
    }

    getSshAccess(poolId: number): Observable<boolean> {
        return this.poolOverviewService.getSshAccess(poolId);
    }

    unlock(pool: Pool): Observable<any> {
        return this.poolOverviewService.unlock(pool).pipe(switchMap(() => this.getAll(this.lastPagination)));
    }

    updatePool(pool: Pool): Observable<any> {
        return this.poolOverviewService.update(pool).pipe(switchMap(() => this.getAll(this.lastPagination)));
    }

    updateComment(pool: Pool): Observable<any> {
        return this.poolOverviewService.updateComment(pool).pipe(switchMap(() => this.getAll(this.lastPagination)));
    }
}
