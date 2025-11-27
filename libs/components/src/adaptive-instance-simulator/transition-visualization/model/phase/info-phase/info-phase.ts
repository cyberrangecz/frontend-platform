import {AdaptiveVisualizationPhase} from '../adaptive-visualization-phase';
import {InfoPhaseTask} from './info-phase-task';

export class InfoPhase extends AdaptiveVisualizationPhase {
    declare tasks: InfoPhaseTask[];
}
