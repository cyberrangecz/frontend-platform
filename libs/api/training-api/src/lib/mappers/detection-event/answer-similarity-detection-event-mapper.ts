import {AbstractDetectionEventTypeEnum, AnswerSimilarityDetectionEvent} from '@crczp/training-model';
import {
    AnswerSimilarityDetectionEventDTO
} from '../../dto/detection-event/answer-similarity/answer-similarity-detection-event-dto';

export class AnswerSimilarityDetectionEventMapper {
    static fromDTO(dto: AnswerSimilarityDetectionEventDTO): AnswerSimilarityDetectionEvent {
        const result = new AnswerSimilarityDetectionEvent();
        result.answer = dto.answer;
        result.answerOwner = dto.answer_owner;
        result.detectionEventType = AbstractDetectionEventTypeEnum.Answer_similarity;
        return result;
    }
}
