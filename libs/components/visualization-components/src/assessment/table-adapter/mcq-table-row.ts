import {AssessmentParticipant} from '@crczp/visualization-model';

/**
 * Table row in multiple choice question table
 */
export class MCQTableRow {
    option: string;
    participants: AssessmentParticipant[];
    isCorrect: boolean;
    answeredCount: number;
    answeredPercentage: number;
}
