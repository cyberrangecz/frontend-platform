import {AccessPhaseTask} from './access-phase-task';
import {AdaptiveVisualizationPhase} from '../adaptive-visualization-phase';

export class AccessPhase extends AdaptiveVisualizationPhase {
    declare tasks: AccessPhaseTask[];
}
