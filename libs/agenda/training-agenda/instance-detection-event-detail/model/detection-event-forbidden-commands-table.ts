import { Column } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { DetectedForbiddenCommand, DetectedForbiddenCommandTypeEnum } from '@crczp/training-model';
import { DatePipe } from '@angular/common';
import { DetectionEventForbiddenCommandsRowAdapter } from './detection-event-forbidden-commands-row-adapter';
import { OffsetPaginatedResource } from '@crczp/api-common';
import { DetectedForbiddenCommandSort } from '@crczp/training-api';

/**
 * @dynamic
 */
export class DetectionEventForbiddenCommandsTable extends TableModel<
    DetectionEventForbiddenCommandsRowAdapter,
    DetectedForbiddenCommandSort
> {
    constructor(resource: OffsetPaginatedResource<DetectedForbiddenCommand>) {
        const columns = [
            new Column<DetectedForbiddenCommandSort>(
                'command',
                'command',
                true,
                'command',
            ),
            new Column<DetectedForbiddenCommandSort>(
                'typeFormatted',
                'type',
                true,
                'type',
            ),
            new Column<DetectedForbiddenCommandSort>(
                'hostname',
                'hostname',
                true,
                'hostname',
            ),
            new Column<DetectedForbiddenCommandSort>(
                'occurredAtFormatted',
                'occurred At',
                true,
                'occurredAt',
            ),
        ];
        const rows = resource.elements.map((element) =>
            DetectionEventForbiddenCommandsTable.createRow(element),
        );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = false;
    }

    private static createRow(
        element: DetectedForbiddenCommand,
    ): LinkedRow<DetectionEventForbiddenCommandsRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as DetectionEventForbiddenCommandsRowAdapter;
        adapter.occurredAtFormatted = `${datePipe.transform(adapter.occurredAt, 'medium')}`;
        adapter.typeFormatted = this.evaluateCommandTypeString(adapter.type);

        return new LinkedRow(adapter);
    }

    private static evaluateCommandTypeString(
        type: DetectedForbiddenCommandTypeEnum,
    ): string {
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
