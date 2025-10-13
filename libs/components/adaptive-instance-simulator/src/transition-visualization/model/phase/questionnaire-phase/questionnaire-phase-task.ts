import {AdaptiveQuestion} from './adaptive-question';
import {AdaptiveVisualizationTask} from '../adaptiveVisualizationTask';
import {QuestionnaireTypeEnum} from '../../enums/questionnaire-type.enum';

export class QuestionnairePhaseTask extends AdaptiveVisualizationTask {
    questions!: AdaptiveQuestion[];
    questionnaireType!: QuestionnaireTypeEnum;
}
