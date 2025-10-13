import { PaginatedResource } from '@sentinel/common/pagination';
import { DatePipe } from '@angular/common';
import { TrainingRun, TrainingRunStateEnum } from '@crczp/training-model';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { AdaptiveRunRowAdapter } from './adaptive-run-row-adapter';
import { Utils } from '@crczp/utils';

/**
 * @dynamic
 */
export class AdaptiveRunTable extends SentinelTable<
    AdaptiveRunRowAdapter,
    string
> {
    constructor(resource: PaginatedResource<TrainingRun>) {
        const columns = [
            new Column<string>('playerName', 'player', false),
            new Column<string>(
                'startTimeFormatted',
                'start time',
                true,
                'startTime',
            ),
            new Column<string>('endTimeFormatted', 'end time', true, 'endTime'),
            new Column<string>('state', 'run state', true, 'state'),
            new Column<string>('duration', 'duration', false),
            new Column<string>('sandboxInstanceId', 'sandbox id', false),
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
