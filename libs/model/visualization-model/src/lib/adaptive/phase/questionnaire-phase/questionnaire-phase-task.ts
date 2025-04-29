import { AdaptiveQuestion } from './adaptive-question';
import { TransitionTask } from '../transition-task';
import { QuestionnaireTypeEnum } from '../../enums/questionnaire-type.enum';

export class QuestionnairePhaseTask extends TransitionTask {
    questions!: AdaptiveQuestion[];
    questionnaireType!: QuestionnaireTypeEnum;
}
