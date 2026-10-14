import { DatePipe } from '@angular/common';
import { TrainingInstance, TrainingRun, TrainingRunStateEnum } from '@crczp/training-model';
import { Column, DeleteAction, RowAction } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { defer, of } from 'rxjs';
import { TrainingRunService } from '../services/runs/training-run.service';
import { TrainingRunRowAdapter } from './training-run-row-adapter';
import { Utils } from '@crczp/utils';
import { TrainingRunSort } from '@crczp/training-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class TrainingRunTable extends TableModel<
    TrainingRunRowAdapter,
    TrainingRunSort
> {
    constructor(
        resource: OffsetPaginatedResource<TrainingRun>,
        service: TrainingRunService,
        trainingInstance: TrainingInstance,
    ) {
        const columns = [
            new Column<TrainingRunSort>('playerName', 'player', false),
            new Column<TrainingRunSort>(
                'startTimeFormatted',
                'start time',
                true,
                'startTime',
            ),
            new Column<TrainingRunSort>(
                'endTimeFormatted',
                'end time',
                true,
                'endTime',
            ),
            new Column<TrainingRunSort>('state', 'run state', true, 'state'),
            new Column<TrainingRunSort>('duration', 'duration', false),
            new Column<TrainingRunSort>('sandboxInstanceId', 'sandbox id', false),
            new Column<TrainingRunSort>('playerEmail', 'email', false),
            new Column<TrainingRunSort>('eventLogging', 'event logging', false),
            new Column<TrainingRunSort>('commandLogging', 'command logging', false),
        ];
        const rows = resource.elements.map((element) => {
            element.trainingInstanceId = trainingInstance.id;
            return TrainingRunTable.createRow(
                element,
                service,
                trainingInstance,
            );
        });
        super(rows, columns);
        this.selectable = false;
        this.pagination = resource.pagination;
        this.filterable = false;
    }

    private static createRow(
        element: TrainingRun,
        service: TrainingRunService,
        instance: TrainingInstance,
    ): LinkedRow<TrainingRunRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as TrainingRunRowAdapter;
        adapter.playerName = adapter.player.name;
        adapter.playerEmail = adapter.player.mail ? adapter.player.mail : '-';
        adapter.startTimeFormatted = `${datePipe.transform(adapter.startTime)}`;
        if (adapter.state === TrainingRunStateEnum.FINISHED) {
            adapter.endTimeFormatted = `${datePipe.transform(adapter.endTime)}`;
            adapter.duration = Utils.Date.timeBetweenDatesSimple(
                adapter.startTime,
                adapter.endTime,
            );
        } else {
            adapter.endTimeFormatted = '-';
            adapter.duration = '-';
        }
        return new LinkedRow(adapter, this.createActions(element, service, instance));
    }

    private static createActions(
        element: TrainingRun,
        service: TrainingRunService,
        instance: TrainingInstance,
    ): RowAction[] {
        return [
            new DeleteAction(
                'Delete training run with sandbox',
                of(false),
                defer(() => service.delete(element, instance.localEnvironment)),
            ),
        ];
    }
}
