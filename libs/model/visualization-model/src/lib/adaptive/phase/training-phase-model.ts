import {TransitionPhase, TransitionTask} from './transition-phase-model';

export class TrainingPhaseTask extends TransitionTask {
    answer?: string;
    content?: string;
    solution?: string;
}

export class TrainingTransitionPhase extends TransitionPhase {
    allowedWrongAnswers!: number;
    allowedCommands!: number;
    estimatedDuration!: number;
    override tasks!: TrainingPhaseTask[];
}
