import { TransitionPhase, TransitionTask } from './transition-phase-model';

export class InfoPhaseTask extends TransitionTask {
    content?: string;
}

export class InfoTransitionPhase extends TransitionPhase {
    override tasks!: InfoPhaseTask[];
}

