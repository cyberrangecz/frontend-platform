import {AdaptiveVisualizationPhase} from '../adaptive-visualization-phase';
import {TrainingPhaseTask} from './training-phase-task';

export class TrainingPhase extends AdaptiveVisualizationPhase {
    allowedWrongAnswers!: number;
    allowedCommands!: number;
    estimatedDuration!: number;
    declare tasks: TrainingPhaseTask[];
}
