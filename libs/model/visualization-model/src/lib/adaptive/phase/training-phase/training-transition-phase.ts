import { TransitionPhase } from '../transition-phase';
import { TrainingPhaseTask } from './training-phase-task';

export class TrainingTransitionPhase extends TransitionPhase {
    allowedWrongAnswers!: number;
    allowedCommands!: number;
    estimatedDuration!: number;
    override tasks!: TrainingPhaseTask[];
}
