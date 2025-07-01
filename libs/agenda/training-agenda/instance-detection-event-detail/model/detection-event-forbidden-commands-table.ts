import { PaginatedResource } from '@sentinel/common/pagination';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { DetectedForbiddenCommand, DetectedForbiddenCommandTypeEnum } from '@crczp/training-model';
import { DatePipe } from '@angular/common';
import { DetectionEventForbiddenCommandsRowAdapter } from './detection-event-forbidden-commands-row-adapter';

/**
 * @dynamic
 */
export class DetectionEventForbiddenCommandsTable extends SentinelTable<DetectionEventForbiddenCommandsRowAdapter> {
    constructor(resource: PaginatedResource<DetectedForbiddenCommand>) {
        const columns = [
            new Column('command', 'command', false),
            new Column('typeFormatted', 'type', false),
            new Column('hostname', 'hostname', false),
            new Column('occurredAtFormatted', 'occurred At', false),
        ];
        const rows = resource.elements.map((element) => DetectionEventForbiddenCommandsTable.createRow(element));
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = false;
    }

    private static createRow(element: DetectedForbiddenCommand): Row<DetectionEventForbiddenCommandsRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as DetectionEventForbiddenCommandsRowAdapter;
        adapter.occurredAtFormatted = `${datePipe.transform(adapter.occurredAt, 'medium')}`;
        adapter.typeFormatted = this.evaluateCommandTypeString(adapter.type);

        return new Row(adapter);
    }

    private static evaluateCommandTypeString(type: DetectedForbiddenCommandTypeEnum): string {
        switch (type) {
            case DetectedForbiddenCommandTypeEnum.Bash:
                return 'BASH';
            case DetectedForbiddenCommandTypeEnum.Msf:
                return 'Msf';
            default:
                return 'Undefined';
        }
    }
}
