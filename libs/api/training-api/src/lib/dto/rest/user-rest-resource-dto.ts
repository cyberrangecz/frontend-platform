import { UserRefDTO } from '../user/user-ref-dto';
import { Paginated } from './paginated';

export interface UserRestResource {
    /**
     * Retrieved Training Definitions from databases.
     */
    content?: UserRefDTO[];
    /**
     * Paginated including: page number, number of elements in page, size, total elements and total pages.
     */
    pagination?: Paginated;
}
