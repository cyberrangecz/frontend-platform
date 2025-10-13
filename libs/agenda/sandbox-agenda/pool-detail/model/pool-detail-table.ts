import { CleanupRequest, SandboxInstance } from '@crczp/sandbox-model';
import { Column, DeleteAction, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { PaginatedResource } from '@sentinel/common/pagination';
import { defer, of } from 'rxjs';
import { PoolDetailRowAdapter } from './pool-detail-row-adapter';
import { CleanupRequestsService } from '../services/state/request/cleanup/cleanup-requests.service';
import { AbstractSandbox } from './abstract-sandbox';
import { SandboxInstanceService } from '../services/state/sandbox-instance/sandbox-instance.service';
import { DatePipe } from '@angular/common';
import { Routing } from '@crczp/routing-commons';

/**
 * @dynamic
 */
export class PoolDetailTable extends SentinelTable<PoolDetailRowAdapter> {
    constructor(
        resource: PaginatedResource<AbstractSandbox>,
        sandboxInstanceService: SandboxInstanceService
    ) {
        const columns = [
            new Column('name', 'name', true, 'id'),
            new Column('comment', 'notes and comments', false, 'comment'),
            new Column('lock', 'lock', false),
            new Column(
                'created',
                'created',
                true,
                'allocation_request__created'
            ),
            new Column(
                'createdBy',
                'created by',
                true,
                'created_by__first_name'
            ),
            new Column('state', 'state', false),
            new Column('stages', 'stages', false),
        ];
        const rows = resource.elements.map((element) =>
            PoolDetailTable.createRow(element, sandboxInstanceService)
        );
        super(rows, columns);
        this.pagination = resource.pagination;
    }

    private static createRow(
        data: AbstractSandbox,
        sandboxInstanceService: SandboxInstanceService
    ): Row<PoolDetailRowAdapter> {
        const rowAdapter = new PoolDetailRowAdapter();
        const dateFormatter = new DatePipe('en-US');
        rowAdapter.unitId = data.allocationRequest.id;
        rowAdapter.name = data.name;
        rowAdapter.comment = data.comment;
        rowAdapter.lock = data.locked ? 'locked' : 'unlocked';
        rowAdapter.created = dateFormatter.transform(
            data.allocationRequest.createdAt
        );
        rowAdapter.createdBy = data.createdBy;
        rowAdapter.state = data.stateResolver();
        rowAdapter.stages = this.requestStageResolver(data);
        const row = new Row(
            rowAdapter,
            this.createActions(data, sandboxInstanceService)
        );
        row.addLink(
            'name',
            Routing.RouteBuilder.pool
                .poolId(data.poolId)
                .sandbox_instance.sandboxInstanceId(data.allocationRequest.id)
                .build()
        );
        return row;
    }

    private static createActions(
        data: AbstractSandbox,
        sandboxInstanceService: SandboxInstanceService
    ): RowAction[] {
        return [
            new DeleteAction(
                'Delete sandbox instance',
                of(data.cleanupRunning() || data.locked),
                defer(() => sandboxInstanceService.createCleanup(data.id))
            ),
            new RowAction(
                'topology',
                'Topology',
                'device_hub',
                'primary',
                'Display topology',
                of(!data.buildFinished()),
                defer(() =>
                    sandboxInstanceService.showTopology(data.poolId, data.uuid)
                )
            ),
            new RowAction(
                'download_user_ssh_config',
                'Get SSH Config',
                'vpn_key',
                'primary',
                'Download user SSH config',
                of(!data.buildFinished()),
                defer(() => sandboxInstanceService.getUserSshAccess(data.uuid))
            ),
            this.createLockAction(
                data.id,
                data.locked,
                data.allocationFailed(),
                data.cleanupRunning() || data.allocationRunning(),
                sandboxInstanceService
            ),
        ];
    }

    private static createLockAction(
        allocationUnitId: number,
        locked: boolean,
        allocationFailed: boolean,
        stateChanging: boolean,
        service: SandboxInstanceService
    ): RowAction {
        if (locked) {
            return new RowAction(
                'unlock',
                'Unlock',
                'lock_open',
                'primary',
                'Unlock sandbox instance',
                of(!locked || stateChanging),
                defer(() => service.unlock(allocationUnitId))
            );
        } else {
            return new RowAction(
                'lock',
                'Lock',
                'lock',
                'primary',
                'Lock sandbox instance',
                of(locked || stateChanging || allocationFailed),
                defer(() => service.lock(allocationUnitId))
            );
        }
    }

    private static createDeleteCleanupAction(
        cleanupRequest: CleanupRequest,
        cleanupRequestService: CleanupRequestsService
    ) {
        return new RowAction(
            'delete_cleanup',
            'delete cleanup request',
            'do_not_disturb_on',
            'warn',
            'Delete cleanup request',
            of(false),
            defer(() => cleanupRequestService.delete(cleanupRequest))
        );
    }

    private static lockResolver(sandboxInstance: SandboxInstance) {
        if (sandboxInstance?.isLocked()) {
            return 'locked';
        }
        return 'unlocked';
    }

    private static requestStageResolver(data: AbstractSandbox) {
        if (data.cleanupRequest) {
            return data.cleanupRequest.stages;
        }
        return data.allocationRequest.stages;
    }
}
