import { Column } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { DetectionEventParticipant } from '@crczp/training-model';
import { DetectionEventParticipantRowAdapter } from './detection-event-participant-row-adapter';
import { DatePipe } from '@angular/common';
import { OffsetPaginatedResource } from '@crczp/api-common';
import { DetectionEventParticipantSort } from '@crczp/training-api';

/**
 * @dynamic
 */
export class DetectionEventParticipantTable extends TableModel<
    DetectionEventParticipantRowAdapter,
    DetectionEventParticipantSort
> {
    constructor(resource: OffsetPaginatedResource<DetectionEventParticipant>) {
        const columns = [
            new Column<DetectionEventParticipantSort>(
                'participantName',
                'name',
                true,
                'participantName',
            ),
            new Column<DetectionEventParticipantSort>(
                'occurredAtFormatted',
                'occurred at',
                true,
                'occurredAt',
            ),
            new Column<DetectionEventParticipantSort>(
                'ipAddress',
                'ip address',
                true,
                'ipAddress',
            ),
            new Column<DetectionEventParticipantSort>(
                'solvedInTimeFormatted',
                'solved in time (seconds)',
                true,
                'solvedInTime',
            ),
        ];
        const rows = resource.elements.map((element) =>
            DetectionEventParticipantTable.createRow(element),
        );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = false;
    }

    private static createRow(
        element: DetectionEventParticipant,
    ): LinkedRow<DetectionEventParticipantRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as DetectionEventParticipantRowAdapter;
        adapter.occurredAtFormatted = `${datePipe.transform(adapter.occurredAt, 'medium')}`;
        adapter.solvedInTimeFormatted =
            adapter.solvedInTime == null ? '' : adapter.solvedInTime.toString();

        return new LinkedRow(adapter);
    }
}
