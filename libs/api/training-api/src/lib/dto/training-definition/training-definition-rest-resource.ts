import { Paginated } from '../rest/paginated';
import { TrainingDefinitionDTO } from './training-definition-dto';

export interface TrainingDefinitionRestResource {
    /**
     * Retrieved Training Definitions from databases.
     */
    content?: TrainingDefinitionDTO[];
    /**
     * Paginated including: page number, number of elements in page, size, total elements and total pages.
     */
    pagination?: Paginated;
}
