import {AdaptiveVisualizationPhase} from '../adaptive-visualization-phase';
import {QuestionnaireTypeEnum} from '../../enums/questionnaire-type.enum';
import {QuestionnairePhaseTask} from './questionnaire-phase-task';

export class QuestionnairePhase extends AdaptiveVisualizationPhase {
    questionnaireType!: QuestionnaireTypeEnum;
    declare tasks: QuestionnairePhaseTask[];
}
