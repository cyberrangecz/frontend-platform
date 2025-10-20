import { DatePipe } from '@angular/common';
import { TrainingRun, TrainingRunStateEnum } from '@crczp/training-model';
import { Column, ExpandableSentinelTable, Row, RowExpand } from '@sentinel/components/table';
import { TrainingRunRowAdapter } from './training-run-row-adapter';
import { TrainingRunInfoComponent } from '../components/runs/detail/training-run-info.component';
import { Utils } from '@crczp/utils';
import { TrainingRunSort } from '@crczp/training-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * @dynamic
 */
export class TrainingRunTable extends ExpandableSentinelTable<
    TrainingRun,
    TrainingRunInfoComponent,
    null,
    TrainingRunSort
> {
    constructor(resource: OffsetPaginatedResource<TrainingRun>) {
        const columns = [
            new Column<TrainingRunSort>(
                'playerName',
                'player',
                true,
                'participantRef',
            ),
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
            new Column<TrainingRunSort>(
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
