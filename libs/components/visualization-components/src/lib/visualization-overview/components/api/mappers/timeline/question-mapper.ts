import { BasicQuestionInfoDTO, TimelineQuestionDTO } from '../../dto/timeline/timeline-question-dto';
import { TimelineQuestion } from '../../../model/timeline/timeline-question';
import { FfqQuestionMapper } from './ffq-question-mapper';
import { FfqQuestionDTO } from '../../dto/timeline/ffq-question-dto';
import { McqQuestionDTO } from '../../dto/timeline/mcq-question-dto';
import { McqQuestionMapper } from './mcq-question-mapper';
import { EmiQuestionDTO } from '../../dto/timeline/emi-question-dto';
import { EmiQuestionMapper } from './emi-question-mapper';

/**
 * @dynamic
 */
export class QuestionMapper {
    static fromDTOs(dtos: TimelineQuestionDTO[]): TimelineQuestion[] {
        return dtos.map((dto) => QuestionMapper.fromDTO(dto));
    }

    static fromDTO(dto: TimelineQuestionDTO): TimelineQuestion {
        let question: TimelineQuestion;

        switch (dto.question_type) {
            case BasicQuestionInfoDTO.QuestionTypeEnum.FFQ: {
                question = FfqQuestionMapper.fromDTO(dto as FfqQuestionDTO);
                question.questionType = BasicQuestionInfoDTO.QuestionTypeEnum.FFQ;
                break;
            }
            case BasicQuestionInfoDTO.QuestionTypeEnum.MCQ: {
                question = McqQuestionMapper.fromDTO(dto as McqQuestionDTO);
                question.questionType = BasicQuestionInfoDTO.QuestionTypeEnum.MCQ;
                break;
            }
            case BasicQuestionInfoDTO.QuestionTypeEnum.EMI: {
                question = EmiQuestionMapper.fromDTO(dto as EmiQuestionDTO);
                question.questionType = BasicQuestionInfoDTO.QuestionTypeEnum.EMI;
                break;
            }
        }

        question.order = dto.order;
        question.penalty = dto.penalty;
        question.text = dto.text;

        return question;
    }
}
