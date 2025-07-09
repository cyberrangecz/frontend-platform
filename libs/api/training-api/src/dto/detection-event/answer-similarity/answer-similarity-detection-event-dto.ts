import {DetectionEventDTO} from '../detection-event-dto';

export interface AnswerSimilarityDetectionEventDTO extends DetectionEventDTO {
    answer: string;
    answer_owner: string;
}
