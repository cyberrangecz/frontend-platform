import {MultipleChoiceQuestionCreateDTOClass} from '../../level/assessment/multiple-choice-question-create-dto';

export class AnsweredMultipleChoiceQuestionDTOClass extends MultipleChoiceQuestionCreateDTOClass {
    user_answers: string[];
}
