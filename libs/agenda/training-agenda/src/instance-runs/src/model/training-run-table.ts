import { DatePipe } from '@angular/common';
import { PaginatedResource } from '@sentinel/common/pagination';
import { TrainingInstance, TrainingRun, TrainingRunStateEnum } from '@crczp/training-model';
import { Column, DeleteAction, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { TrainingRunService } from '../services/runs/training-run.service';
import { TrainingRunRowAdapter } from './training-run-row-adapter';
import { DateHelper } from '@crczp/training-agenda/internal';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class TrainingRunTable extends SentinelTable<TrainingRunRowAdapter> {
    constructor(
        resource: PaginatedResource<TrainingRun>,
        service: TrainingRunService,
        trainingInstance: TrainingInstance,
    ) {
        const columns = [
            new Column('playerName', 'player', false),
            new Column('startTimeFormatted', 'start time', false),
            new Column('endTimeFormatted', 'end time', false),
            new Column('state', 'run state', false),
            new Column('duration', 'duration', false),
            new Column('sandboxInstanceId', 'sandbox id', false),
            new Column('playerEmail', 'email', false),
            new Column('eventLogging', 'event logging', false),
            new Column('commandLogging', 'command logging', false),
        ];
        const rows = resource.elements.map((element) => {
            element.trainingInstanceId = trainingInstance.id;
            return TrainingRunTable.createRow(element, service, trainingInstance);
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
            adapter.duration = DateHelper.timeBetweenDatesSimple(adapter.startTime, adapter.endTime);
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
