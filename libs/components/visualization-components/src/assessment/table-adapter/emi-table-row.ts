import {AssessmentParticipant} from '@crczp/visualization-model';

/**
 * Row in a extend matching items table
 */
export class EMITableRow {
    option: string;
    participants: AssessmentParticipant[];
    isCorrect: boolean;
    answeredCount: number;
    answeredPercentage: number;
}
