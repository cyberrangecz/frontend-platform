import { PaginatedResource } from '@sentinel/common/pagination';
import { Pool, Resources } from '@crczp/sandbox-model';
import {
    Column,
    DeleteAction,
    EditAction,
    ExpandableSentinelTable,
    Row,
    RowAction,
    RowExpand
} from '@sentinel/components/table';
import { defer, Observable, of } from 'rxjs';
import { PoolRowAdapter } from './pool-row-adapter';
import { AbstractPoolService } from '../services/abstract-pool/abstract-sandbox/abstract-pool.service';
import { SandboxInstanceService } from '@crczp/sandbox-agenda/pool-detail';
import { PoolExpandDetailComponent } from '../components/pool-expand-detail/pool-expand-detail.component';
import { Routing } from '@crczp/routing-commons';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class PoolTable extends ExpandableSentinelTable<
    PoolRowAdapter,
    PoolExpandDetailComponent,
    null
> {
    constructor(
        data: PaginatedResource<Pool>,
        resources: Observable<Resources>,
        abstractPoolService: AbstractPoolService,
        sandboxInstanceService: SandboxInstanceService
    ) {
        const rows = data.elements.map((element) =>
            PoolTable.createRow(
                element,
                resources,
                abstractPoolService,
                sandboxInstanceService
            )
        );
        const columns = [
            new Column('title', 'Title', true, 'id'),
            new Column(
                'createdByName',
                'Created by',
                true,
                'created_by__username'
            ),
            new Column(
                'sandboxDefinitionNameAndRevision',
                'Sandbox definition (revision)',
                true,
                'definition__name'
            ),
            new Column('comment', 'Notes and comments', false),
            new Column('lockState', 'State', true, 'lock'),
            new Column('usedAndMaxSize', 'Size', true, 'max_size'),
            new Column(
                'resourcesUtilization',
                'Instances / VCPUs / RAM / ports / network utilization',
                false
            ),
        ];
        const expand = new RowExpand(PoolExpandDetailComponent, null);
        super(rows, columns, expand);
        this.pagination = data.pagination;
    }

    private static createRow(
        pool: Pool,
        resources: Observable<Resources>,
        abstractPoolService: AbstractPoolService,
        sandboxInstanceService: SandboxInstanceService
    ): Row<PoolRowAdapter> {
        const rowAdapter = pool as PoolRowAdapter;
        rowAdapter.title = `Pool ${rowAdapter.id}`;
        rowAdapter.createdByName = pool.createdBy.fullName;
        rowAdapter.sandboxDefinitionNameAndRevision = `${pool.definition.title} (${pool.definition.rev})`;
        rowAdapter.comment = pool.comment;
        rowAdapter.instancesUtilization = pool.hardwareUsage.instances * 100;
        rowAdapter.vcpuUtilization = pool.hardwareUsage.vcpu * 100;
        rowAdapter.ramUtilization = pool.hardwareUsage.ram * 100;
        rowAdapter.portUtilization = pool.hardwareUsage.port * 100;
        rowAdapter.networkUtilization = pool.hardwareUsage.network * 100;
        rowAdapter.resourcesUtilization =
            `${(pool.hardwareUsage.instances * 100).toFixed(1)}% / ` +
            `${(pool.hardwareUsage.vcpu * 100).toFixed(1)}% / ` +
            `${(pool.hardwareUsage.ram * 100).toFixed(1)}% / ` +
            `${(pool.hardwareUsage.port * 100).toFixed(1)}% / ` +
            `${(pool.hardwareUsage.network * 100).toFixed(1)}%`;
        resources.subscribe((data) => (rowAdapter.resources = data));

        const row = new Row(
            rowAdapter,
            this.createActions(
                pool,
                abstractPoolService,
                sandboxInstanceService
            )
        );
        row.addLink(
            'title',
            Routing.RouteBuilder.pool.poolId(rowAdapter.id).build()
        );
        return row;
    }

    private static createActions(
        pool: Pool,
        abstractPoolService: AbstractPoolService,
        sandboxInstanceService: SandboxInstanceService
    ): RowAction[] {
        return [
            new EditAction(
                'Edit Pool',
                of(false),
                defer(() => abstractPoolService.updatePool(pool))
            ),
            new RowAction(
                'allocate_all',
                'Allocate All',
                'subscriptions',
                'primary',
                this.createAllocationTooltip(pool.maxSize, pool.usedSize),
                of(pool.isFull()),
                defer(() =>
                    sandboxInstanceService.allocateSpecified(
                        pool.id,
                        pool.maxSize - pool.usedSize
                    )
                )
            ),
            new RowAction(
                'allocate_one',
                'Allocate One',
                'exposure_plus_1',
                'primary',
                'Allocate one sandbox',
                of(pool.isFull()),
                defer(() => abstractPoolService.allocate(pool, 1))
            ),
            new DeleteAction(
                'Delete Pool',
                of(pool.lockState == 'locked'),
                defer(() => abstractPoolService.delete(pool))
            ),
            this.createLockAction(pool, abstractPoolService),
            new RowAction(
                'download_man_ssh_configs',
                'Get management SSH Configs',
                'vpn_key',
                'primary',
                '',
                of(false),
                defer(() => abstractPoolService.getSshAccess(pool.id))
            ),
        ];
    }

    private static createAllocationTooltip(
        maxSandboxSize: number,
        usedSandboxSize: number
    ): string {
        if (maxSandboxSize - usedSandboxSize == 1) {
            if (maxSandboxSize == 1) return 'Allocate sandbox immediately';
            else return 'Allocate the last sandbox';
        } else return 'Allocate a specific number of sandboxes';
    }

    private static createLockAction(
        pool: Pool,
        service: AbstractPoolService
    ): RowAction {
        if (pool.isLocked()) {
            return new RowAction(
                'unlock',
                'Unlock pool',
                'lock_open',
                'primary',
                'Unlock pool',
                of(false),
                defer(() => service.unlock(pool))
            );
        } else {
            return new RowAction(
                'lock',
                'Lock pool',
                'lock',
                'primary',
                'Lock pool',
                of(false),
                defer(() => service.lock(pool))
            );
        }
    }
}
