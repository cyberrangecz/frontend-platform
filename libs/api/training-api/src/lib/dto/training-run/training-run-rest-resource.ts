import { Paginated } from '../rest/paginated';
import { TrainingRunDTO } from './training-run-dto';

export interface TrainingRunRestResource {
    /**
     * Retrieved Training Runs from databases.
     */
    content?: TrainingRunDTO[];
    /**
     * Paginated including: page number, number of elements in page, size, total elements and total pages.
     */
    pagination?: Paginated;
}
