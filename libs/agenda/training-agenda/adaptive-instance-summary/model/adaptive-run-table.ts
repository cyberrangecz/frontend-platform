import { DatePipe } from '@angular/common';
import { TrainingRun, TrainingRunStateEnum } from '@crczp/training-model';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { AdaptiveRunRowAdapter } from './adaptive-run-row-adapter';
import { Utils } from '@crczp/utils';
import { TrainingRunSort } from '@crczp/training-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * @dynamic
 */
export class AdaptiveRunTable extends SentinelTable<
    AdaptiveRunRowAdapter,
    TrainingRunSort
> {
    constructor(resource: OffsetPaginatedResource<TrainingRun>) {
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
            new Column<TrainingRunSort>(
                'sandboxInstanceId',
                'sandbox id',
                false,
            ),
        ];
        const rows = resource.elements.map((element) =>
            AdaptiveRunTable.createRow(element),
        );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = false;
    }

    private static createRow(element: TrainingRun): Row<AdaptiveRunRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as AdaptiveRunRowAdapter;
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
