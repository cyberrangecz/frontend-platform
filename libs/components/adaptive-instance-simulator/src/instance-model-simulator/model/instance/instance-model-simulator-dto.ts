import { TrainingDefinitionDTO } from '@crczp/training-api';
import { SankeyDataDTO } from '../sankey/dto/sankey-data-dto';

export class InstanceModelSimulatorDTO {
    training_definition: TrainingDefinitionDTO;
    sankey_diagram: SankeyDataDTO;
    cache_key: string;
}
