import { PaginatedResource } from '@sentinel/common/pagination';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { DetectionEventParticipant } from '@crczp/training-model';
import { DetectionEventParticipantRowAdapter } from './detection-event-participant-row-adapter';
import { DatePipe } from '@angular/common';

/**
 * @dynamic
 */
export class DetectionEventParticipantTable extends SentinelTable<DetectionEventParticipantRowAdapter> {
    constructor(resource: PaginatedResource<DetectionEventParticipant>) {
        const columns = [
            new Column('participantName', 'name', false),
            new Column('occurredAtFormatted', 'occurred at', false),
            new Column('ipAddress', 'ip address', false),
            new Column('solvedInTimeFormatted', 'solved in time (seconds)', false),
        ];
        const rows = resource.elements.map((element) => DetectionEventParticipantTable.createRow(element));
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = false;
    }

    private static createRow(element: DetectionEventParticipant): Row<DetectionEventParticipantRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as DetectionEventParticipantRowAdapter;
        adapter.occurredAtFormatted = `${datePipe.transform(adapter.occurredAt, 'medium')}`;
        adapter.solvedInTimeFormatted = adapter.solvedInTime == null ? '' : adapter.solvedInTime.toString();

        return new Row(adapter);
    }
}
