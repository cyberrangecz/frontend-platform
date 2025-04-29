import { AccessPhaseTask } from './access-phase-task';
import { TransitionPhase } from '../transition-phase';

export class AccessTransitionPhase extends TransitionPhase {
    override tasks!: AccessPhaseTask[];
}
