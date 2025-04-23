import { TrainingRunDTO } from './training-run-dto';
import { Paginated } from '@crczp/command-visualizations/internal';

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
