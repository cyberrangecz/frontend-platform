import { DetectionEventDTO } from './detection-event-dto';
import { DjangoOffsetPaginationDTO } from '@crczp/api-common';

export interface DetectionEventRestResource {
    /**
     * Retrieved Detection events from databases.
     */
    content?: DetectionEventDTO[];
    /**
     * Paginated including: page number, number of elements in page, size, total elements and total pages.
     */
    pagination?: DjangoOffsetPaginationDTO;
}
