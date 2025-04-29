import { TransitionPhase } from '../transition-phase';
import { QuestionnaireTypeEnum } from '../../enums/questionnaire-type.enum';
import { QuestionnairePhaseTask } from './questionnaire-phase-task';

export class QuestionnaireTransitionPhase extends TransitionPhase {
    questionnaireType!: QuestionnaireTypeEnum;
    override tasks!: QuestionnairePhaseTask[];
}
