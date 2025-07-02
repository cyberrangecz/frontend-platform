import {AbstractAssessmentAnswerDTO} from './abstract-assessment-answer-dto';

export class ExtendedMatchingItemsAnswerDTO implements AbstractAssessmentAnswerDTO {
    question_id: number;
    extended_matching_pairs: { [key: number]: number };

    constructor() {
        this.question_id = null;
        this.extended_matching_pairs = {};
    }
}
