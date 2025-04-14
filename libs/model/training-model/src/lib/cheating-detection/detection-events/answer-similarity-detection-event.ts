import { AbstractDetectionEvent } from './detection-event';

/**
 * Class representing detection event of type Answer Similarity
 */
export class AnswerSimilarityDetectionEvent extends AbstractDetectionEvent {
    answer!: string;
    answerOwner!: string;
}
