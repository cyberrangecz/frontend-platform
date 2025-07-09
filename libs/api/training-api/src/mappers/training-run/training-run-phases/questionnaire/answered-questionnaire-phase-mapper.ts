import {
    AbstractPhaseTypeEnum,
    AdaptiveQuestion,
    Choice,
    QuestionnairePhase,
    QuestionnaireTypeEnum,
    QuestionTypeEnum,
} from '@crczp/training-model';
import {AnsweredQuestionDTO} from '../../../../dto/training-run/adaptive-run-phases/answered-question-dto';
import {
    AnsweredQuestionnairePhaseDTO
} from '../../../../dto/training-run/adaptive-run-phases/answered-questionnaire-phase-dto';
import {ChoiceDTO} from '../../../../dto/phase/questionnaire-phase/choice-dto';

export class AnsweredQuestionnairePhaseMapper {
    static fromDTO(dto: AnsweredQuestionnairePhaseDTO): QuestionnairePhase {
        const result = new QuestionnairePhase();
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
        if (dto.questions === undefined || dto.questions === null) {
            result.questions = [];
        } else {
            result.questions = this.mapQuestionsFromDTO(dto.questions).sort((a, b) => a.order - b.order);
        }
        return result;
    }

    private static mapQuestionsFromDTO(questions: AnsweredQuestionDTO[]): AdaptiveQuestion[] {
        const result = [] as AdaptiveQuestion[];
        questions.forEach((questionDTO) => {
            const question = new AdaptiveQuestion();
            question.id = questionDTO.id;
            question.order = questionDTO.order;
            question.text = questionDTO.text;
            question.choices = this.mapChoicesFromDTO(questionDTO.choices).sort((a, b) => a.order - b.order);
            question.userAnswers = questionDTO.user_answers;
            switch (questionDTO.question_type) {
                case 'FFQ': {
                    question.questionType = QuestionTypeEnum.FFQ;
                    break;
                }
                case 'MCQ': {
                    question.questionType = QuestionTypeEnum.MCQ;
                    break;
                }
                case 'RFQ': {
                    question.questionType = QuestionTypeEnum.RFQ;
                    break;
                }
            }
            result.push(question);
        });
        return result;
    }

    private static mapChoicesFromDTO(choices: ChoiceDTO[]): Choice[] {
        const result = [] as Choice[];
        choices.forEach((choiceDto) => {
            const choice = new Choice();
            choice.id = choiceDto.id;
            choice.order = choiceDto.order;
            choice.text = choiceDto.text;
            choice.correct = choiceDto.correct;
            result.push(choice);
        });
        return result;
    }
}
