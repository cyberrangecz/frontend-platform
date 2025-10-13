import {TransitionPhase, TransitionTask} from './transition-phase-model';

export class AccessPhaseTask extends TransitionTask {

    cloudContent?: string;
    localContent?: string;
}

export class AccessTransitionPhase extends TransitionPhase {
    declare tasks: AccessPhaseTask[];
}
