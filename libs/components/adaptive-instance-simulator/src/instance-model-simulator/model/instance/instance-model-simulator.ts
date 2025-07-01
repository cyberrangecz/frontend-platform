import { TrainingDefinition } from '@crczp/training-model';
import { SankeyData } from '../sankey/sankey-data';

export class InstanceModelSimulator {
    trainingDefinition: TrainingDefinition;
    sankeyData: SankeyData;
    cacheId: string;
}
