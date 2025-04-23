import { Paginated } from '../other/paginated';
import { AccessedTrainingRunDTO } from './accessed-training-run-dto';

export interface AccessedTrainingRunRestResource {
    /**
     * Retrieved Accessed Training Runs from databases.
     */
    content?: AccessedTrainingRunDTO[];
    /**
     * Paginated including: page number, number of elements in page, size, total elements and total pages.
     */
    pagination?: Paginated;
}
