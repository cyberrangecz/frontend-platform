import {QuestionnairePhaseDTO} from '../../../dto/phase/questionnaire-phase/questionnaire-phase-dto';
import {QuestionDTO} from '../../../dto/phase/questionnaire-phase/question-dto';
import {ChoiceDTO} from '../../../dto/phase/questionnaire-phase/choice-dto';
import {
    AdaptiveQuestionVisualization,
    ChoiceVisualization,
    QuestionnairePhaseTaskVisuazlization
} from '@crczp/visualization-model';
import {QuestionnaireTypeEnum, QuestionTypeEnum} from '@crczp/training-model';


export class QuestionnairePhaseTaskMapper {
    static fromDTO(dto: QuestionnairePhaseDTO): QuestionnairePhaseTaskVisuazlization {
        const result = new QuestionnairePhaseTaskVisuazlization();
        result.id = 0;
        result.order = 0;
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

    private static mapQuestionsFromDTO(questions: QuestionDTO[]): AdaptiveQuestionVisualization[] {
        const result: AdaptiveQuestionVisualization[] = [];
        questions.forEach((questionDTO) => {
            const question = new AdaptiveQuestionVisualization();
            question.id = questionDTO.id;
            question.order = questionDTO.order;
            question.text = questionDTO.text;
            question.choices = this.mapChoicesFromDTO(questionDTO.choices).sort((a, b) => a.order - b.order);
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

    private static mapChoicesFromDTO(choices: ChoiceDTO[]): ChoiceVisualization[] {
        const result: ChoiceVisualization[] = [];
        choices.forEach((choiceDto) => {
            const choice = new ChoiceVisualization();
            choice.id = choiceDto.id;
            choice.order = choiceDto.order;
            choice.text = choiceDto.text;
            choice.correct = choiceDto.correct;
            result.push(choice);
        });
        return result;
    }
}
