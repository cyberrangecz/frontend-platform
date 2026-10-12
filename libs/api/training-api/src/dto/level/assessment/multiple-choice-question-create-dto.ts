import {AbstractQuestionCreateDTO, AbstractQuestionDTOQuestionTypeEnum} from './abstact-question-dto';
import {QuestionChoiceDTO} from './question-choice-dto';

export interface MultipleChoiceQuestionCreateDTO extends AbstractQuestionCreateDTO {
    choices: QuestionChoiceDTO[];
}

export class MultipleChoiceQuestionCreateDTOClass implements MultipleChoiceQuestionCreateDTO {
    answer_required: boolean;
    order: number;
    penalty: number;
    points: number;
    question_type: AbstractQuestionDTOQuestionTypeEnum;
    text: string;
    choices: QuestionChoiceDTO[];
}
