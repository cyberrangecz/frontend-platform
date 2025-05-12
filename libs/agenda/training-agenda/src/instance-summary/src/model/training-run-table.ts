import { DatePipe } from '@angular/common';
import { PaginatedResource } from '@sentinel/common/pagination';
import { TrainingRun, TrainingRunStateEnum } from '@crczp/training-model';
import { Column, ExpandableSentinelTable, Row, RowExpand } from '@sentinel/components/table';
import { TrainingRunRowAdapter } from './training-run-row-adapter';
import { DateHelper } from '@crczp/training-agenda/internal';
import { TrainingRunInfoComponent } from '../components/runs/detail/training-run-info.component';

/**
 * @dynamic
 */
export class TrainingRunTable extends ExpandableSentinelTable<TrainingRun, TrainingRunInfoComponent, null> {
    constructor(resource: PaginatedResource<TrainingRun>) {
        const columns = [
            new Column('playerName', 'player', true, 'participantRef'),
            new Column('startTimeFormatted', 'start time', true, 'startTime'),
            new Column('endTimeFormatted', 'end time', true, 'endTime'),
            new Column('state', 'run state', true, 'state'),
            new Column('duration', 'duration', false),
            new Column('sandboxInstanceAllocationId', 'sandbox id', false),
            /**
             * DISABLED FOR THE 23.03 release
             */
            // new Column('hasDetectionEvents', 'has detection events', false),
        ];
        const rows = resource.elements.map((element) => TrainingRunTable.createRow(element));
        const expand = new RowExpand(TrainingRunInfoComponent, null);
        super(rows, columns, expand);
        this.pagination = resource.pagination;
        this.filterable = false;
    }

    private static createRow(element: TrainingRun): Row<TrainingRunRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as TrainingRunRowAdapter;
        adapter.playerName = adapter.player.name;
        adapter.startTimeFormatted = `${datePipe.transform(adapter.startTime)}`;
        if (adapter.state === TrainingRunStateEnum.FINISHED) {
            adapter.endTimeFormatted = `${datePipe.transform(adapter.endTime)}`;
            adapter.duration = DateHelper.timeBetweenDatesSimple(adapter.startTime, adapter.endTime);
        } else {
            adapter.endTimeFormatted = '-';
            adapter.duration = '-';
        }
        return new Row(adapter);
    }
}
