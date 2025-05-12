import { PaginatedResource } from '@sentinel/common/pagination';
import { TrainingInstance } from '@crczp/training-model';
import { Column, DeleteAction, EditAction, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { combineLatest, defer, of, startWith } from 'rxjs';
import { TrainingNavigator } from '../../../../index';
import { AdaptiveInstanceRowAdapter } from './adaptive-instance-row-adapter';
import { AdaptiveInstanceOverviewService } from '../../services/state/adaptive-instance-overview.service';
import { DateHelper } from '@crczp/training-agenda/internal';
import { DatePipe } from '@angular/common';
import { map } from 'rxjs/operators';

/**
 * @dynamic
 */
export class AdaptiveInstanceTable extends SentinelTable<AdaptiveInstanceRowAdapter> {
    constructor(
        resource: PaginatedResource<TrainingInstance>,
        service: AdaptiveInstanceOverviewService,
        navigator: TrainingNavigator,
    ) {
        const columns = [
            new Column('title', 'Title', true),
            new Column('startTime', 'Start Time', true, 'startTime'),
            new Column('endTime', 'End Time', true, 'endTime'),
            new Column('expiresIn', 'Expires In', true, 'endTime'),
            new Column('tdTitle', 'Adaptive Definition', true, 'title'),
            new Column('lastEditBy', 'Last Edit By', false),
            new Column('poolTitle', 'Pool', true, 'poolId'),
            new Column('poolSize', 'Pool Size', false),
            new Column('accessToken', 'Access Token', true, 'accessToken'),
        ];
        const rows = resource.elements.map((element) => AdaptiveInstanceTable.createRow(element, service, navigator));
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterLabel = 'Filter by title';
        this.filterable = true;
        this.selectable = false;
    }

    private static createRow(
        ti: TrainingInstance,
        service: AdaptiveInstanceOverviewService,
        navigator: TrainingNavigator,
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

        row.addLink('title', navigator.toAdaptiveInstanceDetail(ti.id));
        row.addLink('tdTitle', navigator.toAdaptiveDefinitionDetail(adapter.trainingDefinition.id));
        if (ti.hasPool()) {
            row.element.poolSize = combineLatest([
                service.getPoolSize(ti.poolId),
                service.getAvailableSandboxes(ti.poolId),
            ]);
            row.addLink('poolTitle', navigator.toPool(ti.poolId));
        } else {
            row.element.poolSize = of(['-', '']);
        }
        return row;
    }

    private static createActions(ti: TrainingInstance, service: AdaptiveInstanceOverviewService): RowAction[] {
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
