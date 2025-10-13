import { PaginatedResource } from '@sentinel/common/pagination';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { DetectionEventParticipant } from '@crczp/training-model';
import { DetectionEventParticipantRowAdapter } from './detection-event-participant-row-adapter';
import { DatePipe } from '@angular/common';

/**
 * @dynamic
 */
export class DetectionEventParticipantTable extends SentinelTable<
    DetectionEventParticipantRowAdapter,
    string
> {
    constructor(resource: PaginatedResource<DetectionEventParticipant>) {
        const columns = [
            new Column<string>('participantName', 'name', false),
            new Column<string>('occurredAtFormatted', 'occurred at', false),
            new Column<string>('ipAddress', 'ip address', false),
            new Column<string>(
                'solvedInTimeFormatted',
                'solved in time (seconds)',
                false,
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
    ): Row<DetectionEventParticipantRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as DetectionEventParticipantRowAdapter;
        adapter.occurredAtFormatted = `${datePipe.transform(adapter.occurredAt, 'medium')}`;
        adapter.solvedInTimeFormatted =
            adapter.solvedInTime == null ? '' : adapter.solvedInTime.toString();

        return new Row(adapter);
    }
}
