import { Paginated } from '../rest/paginated';
import { DetectedForbiddenCommandDTO } from './detected-forbidden-command-dto';

export interface DetectedForbiddenCommandRestResource {
    /**
     * Retrieved detection event forbidden commands from databases.
     */
    content?: DetectedForbiddenCommandDTO[];
    /**
     * Paginated including: page number, number of elements in page, size, total elements and total pages.
     */
    pagination?: Paginated;
}
