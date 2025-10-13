import {QuestionDTO} from '../../phase/questionnaire-phase/question-dto';

export class AnsweredQuestionDTO extends QuestionDTO {
    user_answers: string[];
}
