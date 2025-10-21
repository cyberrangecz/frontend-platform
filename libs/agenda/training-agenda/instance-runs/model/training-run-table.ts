import { DatePipe } from '@angular/common';
import { TrainingInstance, TrainingRun, TrainingRunStateEnum } from '@crczp/training-model';
import { Column, DeleteAction, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { TrainingRunService } from '../services/runs/training-run.service';
import { TrainingRunRowAdapter } from './training-run-row-adapter';
import { Utils } from '@crczp/utils';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class TrainingRunTable extends SentinelTable<
    TrainingRunRowAdapter,
    string
> {
    constructor(
        resource: OffsetPaginatedResource<TrainingRun>,
        service: TrainingRunService,
        trainingInstance: TrainingInstance,
    ) {
        const columns = [
            new Column<string>('playerName', 'player', false),
            new Column<string>('startTimeFormatted', 'start time', false),
            new Column<string>('endTimeFormatted', 'end time', false),
            new Column<string>('state', 'run state', false),
            new Column<string>('duration', 'duration', false),
            new Column<string>('sandboxInstanceId', 'sandbox id', false),
            new Column<string>('playerEmail', 'email', false),
            new Column<string>('eventLogging', 'event logging', false),
            new Column<string>('commandLogging', 'command logging', false),
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
    ): Row<TrainingRunRowAdapter> {
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
        return new Row(adapter, this.createActions(element, service, instance));
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
