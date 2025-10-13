import { PaginatedResource } from '@sentinel/common/pagination';
import { TrainingInstance, TrainingRun, TrainingRunStateEnum } from '@crczp/training-model';
import { Column, DeleteAction, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { AdaptiveRunService } from '../services/runs/adaptive-run.service';
import { AdaptiveRunRowAdapter } from './adaptive-run-row-adapter';
import { DatePipe } from '@angular/common';
import { Utils } from '@crczp/utils';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class AdaptiveRunTable extends SentinelTable<
    AdaptiveRunRowAdapter,
    string
> {
    constructor(
        resource: PaginatedResource<TrainingRun>,
        service: AdaptiveRunService,
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
            return AdaptiveRunTable.createRow(
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
        service: AdaptiveRunService,
        instance: TrainingInstance,
    ): Row<AdaptiveRunRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as AdaptiveRunRowAdapter;
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
        service: AdaptiveRunService,
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
