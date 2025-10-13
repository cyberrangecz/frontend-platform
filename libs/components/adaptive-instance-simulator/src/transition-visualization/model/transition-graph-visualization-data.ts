import {AdaptiveVisualizationPhase} from './phase/adaptive-visualization-phase';
import {AdaptiveRunVisualization} from "@crczp/visualization-model";

export class TransitionGraphVisualizationData {
    phases!: AdaptiveVisualizationPhase[];
    trainingRunsData!: AdaptiveRunVisualization[];
}
