import { DatePipe } from '@angular/common';
import { PaginatedResource } from '@sentinel/common/pagination';
import { TrainingRun, TrainingRunStateEnum } from '@crczp/training-model';
import { Column, ExpandableSentinelTable, Row, RowExpand } from '@sentinel/components/table';
import { TrainingRunRowAdapter } from './training-run-row-adapter';
import { TrainingRunInfoComponent } from '../components/runs/detail/training-run-info.component';
import { Utils } from '@crczp/utils';

/**
 * @dynamic
 */
export class TrainingRunTable extends ExpandableSentinelTable<
    TrainingRun,
    TrainingRunInfoComponent,
    null,
    string
> {
    constructor(resource: PaginatedResource<TrainingRun>) {
        const columns = [
            new Column<string>('playerName', 'player', true, 'participantRef'),
            new Column<string>(
                'startTimeFormatted',
                'start time',
                true,
                'startTime',
            ),
            new Column<string>('endTimeFormatted', 'end time', true, 'endTime'),
            new Column<string>('state', 'run state', true, 'state'),
            new Column<string>('duration', 'duration', false),
            new Column<string>(
                'sandboxInstanceAllocationId',
                'sandbox id',
                false,
            ),
            /**
             * DISABLED FOR THE 23.03 release
             */
            // new Column<string>('hasDetectionEvents', 'has detection events', false),
        ];
        const rows = resource.elements.map((element) =>
            TrainingRunTable.createRow(element),
        );
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
            adapter.duration = Utils.Date.timeBetweenDatesSimple(
                adapter.startTime,
                adapter.endTime,
            );
        } else {
            adapter.endTimeFormatted = '-';
            adapter.duration = '-';
        }
        return new Row(adapter);
    }
}
