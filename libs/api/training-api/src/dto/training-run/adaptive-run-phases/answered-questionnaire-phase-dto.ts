import {AbstractPhaseDTO} from '../../phase/abstract-phase-dto';
import {AnsweredQuestionDTO} from './answered-question-dto';

export interface AnsweredQuestionnairePhaseDTO extends AbstractPhaseDTO {
    questions: AnsweredQuestionDTO[];
    questionnaire_type: QuestionnairePhaseDTO.QuestionnaireTypeEnum;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace QuestionnairePhaseDTO {
    export type QuestionnaireTypeEnum = 'ADAPTIVE' | 'GENERAL';
    export const QuestionnaireTypeEnum = {
        ADAPTIVE: 'ADAPTIVE' as QuestionnaireTypeEnum,
        GENERAL: 'GENERAL' as QuestionnaireTypeEnum,
    };
}
