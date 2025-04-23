import { Paginated } from '../rest/paginated';
import { TrainingInstanceDTO } from './training-instance-dto';

export interface TrainingInstanceRestResource {
    /**
     * Retrieved Training Instances from databases.
     */
    content?: TrainingInstanceDTO[];
    /**
     * Paginated including: page number, number of elements in page, size, total elements and total pages.
     */
    pagination?: Paginated;
}
