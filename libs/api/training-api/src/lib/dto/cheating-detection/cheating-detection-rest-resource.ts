import { CheatingDetectionDTO } from './cheating-detection-dto';
import { Paginated } from '../rest/paginated';

export interface CheatingDetectionRestResource {
    /**
     * Retrieved Cheating detections from databases.
     */
    content?: CheatingDetectionDTO[];
    /**
     * Paginated including: page number, number of elements in page, size, total elements and total pages.
     */
    pagination?: Paginated;
}
