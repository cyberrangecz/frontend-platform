import { TrainingInstance } from '@crczp/training-model';
import { Column, DeleteAction, EditAction, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { defer, of, startWith } from 'rxjs';
import { AdaptiveInstanceRowAdapter } from './adaptive-instance-row-adapter';
import { AdaptiveInstanceOverviewService } from '../../services/state/adaptive-instance-overview.service';
import { map, shareReplay } from 'rxjs/operators';
import { Routing } from '@crczp/routing-commons';
import { TrainingInstanceSort } from '@crczp/training-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * @dynamic
 */
export class AdaptiveInstanceTable extends SentinelTable<
    AdaptiveInstanceRowAdapter,
    TrainingInstanceSort
> {
    constructor(
        resource: OffsetPaginatedResource<TrainingInstance>,
        service: AdaptiveInstanceOverviewService,
    ) {
        const columns = [
            new Column<TrainingInstanceSort>('title', 'Title', true),
            new Column<TrainingInstanceSort>(
                'startTime',
                'Start Time',
                true,
                'startTime',
            ),
            new Column<TrainingInstanceSort>(
                'endTime',
                'End Time',
                true,
                'endTime',
            ),
            new Column<TrainingInstanceSort>('expiresIn', 'Expires In', false),
            new Column<TrainingInstanceSort>(
                'tdTitle',
                'Adaptive Definition',
                false,
            ),
            new Column<TrainingInstanceSort>(
                'lastEditBy',
                'Last Edit By',
                false,
            ),
            new Column<TrainingInstanceSort>(
                'poolTitle',
                'Pool',
                true,
                'poolId',
            ),
            new Column<TrainingInstanceSort>('poolSize', 'Pool Size', false),
            new Column<TrainingInstanceSort>(
                'accessToken',
                'Access Token',
                true,
                'accessToken',
            ),
        ];
        const rows = resource.elements.map((element) =>
            AdaptiveInstanceTable.createRow(element, service),
        );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterLabel = 'Filter by title';
        this.filterable = true;
        this.selectable = false;
    }

    private static createRow(
        ti: TrainingInstance,
        service: AdaptiveInstanceOverviewService,
    ): Row<AdaptiveInstanceRowAdapter> {
        const adapter = ti as AdaptiveInstanceRowAdapter;
        adapter.tdTitle = adapter.trainingDefinition.title;
        if (adapter.hasPool()) {
            adapter.poolTitle = `Pool ${adapter.poolId}`;
        } else if (adapter.localEnvironment) {
            adapter.poolTitle = `Local`;
        } else {
            adapter.poolTitle = '-';
        }
        const row = new Row(adapter, this.createActions(ti, service));

        row.addLink(
            'title',
            Routing.RouteBuilder.adaptive_instance
                .instanceId(ti.id)
                .detail.build(),
        );
        row.addLink(
            'tdTitle',
            Routing.RouteBuilder.adaptive_definition
                .definitionId(adapter.trainingDefinition.id)
                .detail.build(),
        );
        if (ti.hasPool()) {
            row.element.poolSize = service.getPoolSize(ti.poolId).pipe(
                shareReplay({ bufferSize: 1, refCount: false }),
            );
            row.addLink(
                'poolTitle',
                Routing.RouteBuilder.pool.poolId(ti.poolId).build(),
            );
        } else {
            row.element.poolSize = of({error: 'NOT_ASSIGNED'}) ;
        }
        return row;
    }

    private static createActions(
        ti: TrainingInstance,
        service: AdaptiveInstanceOverviewService,
    ): RowAction[] {
        return [
            new EditAction(
                'Edit training instance',
                of(false),
                defer(() => service.edit(ti.id)),
            ),
            new DeleteAction(
                'Delete training instance',
                of(false),
                defer(() => service.delete(ti)),
            ),
            new RowAction(
                'get_data',
                'Get Data',
                'cloud_download',
                'primary',
                'Download ZIP file containing all training instance data',
                of(false),
                defer(() => service.download(ti.id)),
            ),
            new RowAction(
                'get_ssh_configs',
                'Get SSH Configs',
                'vpn_key',
                'primary',
                'Download management SSH configs',
                service.poolExists(ti.poolId).pipe(
                    startWith(false),
                    map((exists) => !exists),
                ),
                defer(() => service.getSshAccess(ti.poolId)),
            ),
            new RowAction(
                'training_runs',
                'Training Runs',
                'run_circle',
                'primary',
                'Manage training runs',
                of(false),
                defer(() => service.runs(ti.id)),
            ),
            new RowAction(
                'display_token',
                'Display Token',
                'pin',
                'primary',
                'Display page containing access token',
                of(false),
                defer(() => service.token(ti.id)),
            ),
            new RowAction(
                'progress',
                'Show Progress',
                'insights',
                'primary',
                'Show progress of training runs',
                of(!ti.hasStarted()),
                defer(() => service.progress(ti.id)),
            ),
        ];
    }
}
