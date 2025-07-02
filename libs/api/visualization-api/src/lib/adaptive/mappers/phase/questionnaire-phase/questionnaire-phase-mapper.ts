import {QuestionnairePhaseDTO} from '../../../dto/phase/questionnaire-phase/questionnaire-phase-dto';
import {QuestionnairePhaseTaskMapper} from './questionnaire-phase-task-mapper';
import {AbstractPhaseTypeEnum, QuestionnaireTypeEnum} from '@crczp/training-model';
import {QuestionnaireTransitionPhase} from '@crczp/visualization-model';

export class QuestionnairePhaseMapper {
    static fromDTO(dto: QuestionnairePhaseDTO): QuestionnaireTransitionPhase {
        const result = new QuestionnaireTransitionPhase();
        result.type = AbstractPhaseTypeEnum.Questionnaire;
        switch (dto.questionnaire_type) {
            case 'ADAPTIVE': {
                result.questionnaireType = QuestionnaireTypeEnum.Adaptive;
                break;
            }
            case 'GENERAL': {
                result.questionnaireType = QuestionnaireTypeEnum.General;
                break;
            }
        }

        result.tasks = [QuestionnairePhaseTaskMapper.fromDTO(dto)];

        return result;
    }
}
