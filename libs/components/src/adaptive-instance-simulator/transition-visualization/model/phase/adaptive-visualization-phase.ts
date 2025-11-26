import {VisualizationPhaseTypeEnum} from '../enums/visualization-phase-type.enum';
import {AdaptiveVisualizationTask} from './adaptiveVisualizationTask';

export abstract class AdaptiveVisualizationPhase {
    id!: number;
    title!: string;
    order!: number;
    type!: VisualizationPhaseTypeEnum;
    tasks!: AdaptiveVisualizationTask[];
}
