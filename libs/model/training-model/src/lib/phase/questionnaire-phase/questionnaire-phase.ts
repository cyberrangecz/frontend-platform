import { AdaptiveQuestion } from './adaptive-question';
import { Phase } from '../phase';
import { PhaseRelation } from './phase-relation';
import { QuestionnaireTypeEnum } from '../../enums/questionnaire-type.enum';

export class QuestionnairePhase extends Phase {
    questionnaireType!: QuestionnaireTypeEnum;
    questions: AdaptiveQuestion[] = [];
    phaseRelations: PhaseRelation[] = [];
}
