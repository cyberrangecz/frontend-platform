import { Paginated } from '../rest/paginated';
import { DetectionEventParticipantDTO } from './detection-event-participant-dto';

export interface DetectionEventParticipantRestResource {
    /**
     * Retrieved detection event participants from databases.
     */
    content?: DetectionEventParticipantDTO[];
    /**
     * Paginated including: page number, number of elements in page, size, total elements and total pages.
     */
    pagination?: Paginated;
}
