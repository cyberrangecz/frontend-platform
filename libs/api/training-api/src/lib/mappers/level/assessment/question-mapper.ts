import {ExtendedMatchingItems, FreeFormQuestion, MultipleChoiceQuestion, Question} from '@crczp/training-model';
import {AbstractQuestionCreateDTO} from '../../../dto/level/assessment/abstact-question-dto';
import {AbstractAssessmentAnswerDTO} from '../../../dto/level/assessment/abstract-assessment-answer-dto';
import {ExtendedMatchingItemsMapper} from './extended-matching-items-mapper';
import {FreeFormQuestionMapper} from './free-form-question-mapper';
import {MultipleChoiceQuestionMapper} from './multiple-choice-question-mapper';
import {FreeFormQuestionCreateDTO} from '../../../dto/level/assessment/free-form-question-dto';
import {MultipleChoiceQuestionCreateDTO} from '../../../dto/level/assessment/multiple-choice-question-create-dto';
import {ExtendedMatchingItemsDTO} from '../../../dto/level/assessment/extended-matching-items-dto';

/**
 * @dynamic
 */
export class QuestionMapper {
    static fromDTO(dto: any): Question {
        let question: Question;

        switch (dto.question_type) {
            case 'FFQ': {
                question = FreeFormQuestionMapper.fromDTO(dto);
                break;
            }
            case 'EMI': {
                question = ExtendedMatchingItemsMapper.fromDTO(dto);
                break;
            }
            case 'MCQ': {
                question = MultipleChoiceQuestionMapper.fromDTO(dto);
                break;
            }
            default: {
                console.error('Could not map question from JSON to any of known types');
                return undefined;
            }
        }

        question.id = dto.id;
        question.required = dto.answer_required;
        question.penalty = dto.penalty;
        question.score = dto.points;
        question.order = dto.order;
        return question;
    }

    static fromDTOs(dtos: any[]): Question[] {
        return dtos.map((dto) => QuestionMapper.fromDTO(dto));
    }

    static toAnswersDTO(question: Question): AbstractAssessmentAnswerDTO {
        if (question instanceof FreeFormQuestion) {
            return FreeFormQuestionMapper.toAnswersDTO(question);
        }
        if (question instanceof MultipleChoiceQuestion) {
            return MultipleChoiceQuestionMapper.toAnswersDTO(question);
        }
        if (question instanceof ExtendedMatchingItems) {
            return ExtendedMatchingItemsMapper.toAnswersDTO(question);
        }
    }

    static toAnswersDTOs(questions: Question[]): AbstractAssessmentAnswerDTO[] {
        return questions.map((question) => this.toAnswersDTO(question));
    }

    static toCreateDTO(question: Question): AbstractQuestionCreateDTO {
        let questionDTO: FreeFormQuestionCreateDTO | MultipleChoiceQuestionCreateDTO | ExtendedMatchingItemsDTO;
        if (question instanceof FreeFormQuestion) {
            questionDTO = FreeFormQuestionMapper.toCreateDTO(question);
        } else if (question instanceof MultipleChoiceQuestion) {
            questionDTO = MultipleChoiceQuestionMapper.toCreateDTO(question);
        }else if (question instanceof ExtendedMatchingItems) {
            questionDTO = ExtendedMatchingItemsMapper.toCreateDTO(question);
        } else {
            throw new TypeError("Unknown question type");
        }

        if('id' in questionDTO) questionDTO.id = question.id;
        questionDTO.answer_required = question.required;
        questionDTO.order = question.order;
        questionDTO.penalty = question.penalty;
        questionDTO.points = question.score;
        questionDTO.text = question.title;
        return questionDTO;
    }

    static toCreateDTOs(questions: Question[]): AbstractQuestionCreateDTO[] {
        const result: AbstractQuestionCreateDTO[] = [];
        if (!questions || questions.length < 1) {
            return [];
        }
        let index = 0;
        questions.forEach((question) => {
            const questionDTO = QuestionMapper.toCreateDTO(question);
            questionDTO.order = index;
            index++;
            result.push(questionDTO);
        });
        return result;
    }
}
