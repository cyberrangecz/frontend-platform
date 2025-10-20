import { TrainingInstance } from '@crczp/training-model';
import { Column, DeleteAction, EditAction, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { combineLatest, defer, of, startWith } from 'rxjs';
import { TrainingInstanceOverviewService } from '../../services/state/training-instance-overview.service';
import { TrainingInstanceRowAdapter } from './training-instance-row-adapter';
import { map } from 'rxjs/operators';
import { Routing } from '@crczp/routing-commons';
import { TrainingInstanceSort } from '@crczp/training-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * @dynamic
 */
export class TrainingInstanceTable extends SentinelTable<
    TrainingInstanceRowAdapter,
    TrainingInstanceSort
> {
    constructor(
        resource: OffsetPaginatedResource<TrainingInstance>,
        service: TrainingInstanceOverviewService,
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
                'Training Definition',
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
            TrainingInstanceTable.createRow(element, service),
        );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterLabel = 'Filter by title';
        this.filterable = true;
        this.selectable = false;
    }

    private static createRow(
        ti: TrainingInstance,
        service: TrainingInstanceOverviewService,
    ): Row<TrainingInstanceRowAdapter> {
        const adapter = ti as TrainingInstanceRowAdapter;
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
            Routing.RouteBuilder.linear_instance
                .instanceId(ti.id)
                .detail.build(),
        );
        row.addLink(
            'tdTitle',
            Routing.RouteBuilder.linear_definition
                .definitionId(ti.trainingDefinition.id)
                .build(),
        );
        if (ti.hasPool()) {
            row.element.poolSize = combineLatest([
                service.getPoolSize(ti.poolId),
                service.getAvailableSandboxes(ti.poolId),
            ]);
            row.addLink(
                'poolTitle',
                Routing.RouteBuilder.pool.poolId(ti.poolId).build(),
            );
        } else {
            row.element.poolSize = of(['-', '']);
        }
        return row;
    }

    private static createActions(
        ti: TrainingInstance,
        service: TrainingInstanceOverviewService,
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
            new RowAction(
                'results',
                'Show Results',
                'assessment',
                'primary',
                'Show results of training runs',
                of(!ti.hasStarted()),
                defer(() => service.results(ti.id)),
            ),
        ];
    }
}
