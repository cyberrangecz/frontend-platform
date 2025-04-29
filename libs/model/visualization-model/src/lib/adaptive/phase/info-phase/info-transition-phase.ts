import { TransitionPhase } from '../transition-phase';
import { InfoPhaseTask } from './info-phase-task';

export class InfoTransitionPhase extends TransitionPhase {
    override tasks!: InfoPhaseTask[];
}
