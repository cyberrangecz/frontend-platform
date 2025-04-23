import { Paginated } from '../rest/paginated';
import { TrainingDefinitionInfoDTO } from './training-definition-info-dto';

export interface TrainingDefinitionInfoRestResource {
    content?: TrainingDefinitionInfoDTO[];
    pagination?: Paginated;
}
