import {TrainingUser} from '@crczp/training-model';

export class AssessmentParticipant extends TrainingUser {
    isHighlighted?: boolean;
}

export class AssessmentOption {
    text: string;
    participants: AssessmentParticipant[];
    correct: boolean;
}

export class AssessmentAnswer {
    text: string;
    participants: AssessmentParticipant[];
    correct: boolean;
}


export class AssessmentEmiAnswers extends AssessmentAnswer {
    options: AssessmentOption[];
}


export class AssessmentQuestion {
    id: number;
    questionType: string;
    text: string;
    order: number;
    answers: AssessmentAnswer[] | AssessmentEmiAnswers[];
}

export class Assessment {
    id: number;
    title: string;
    order: number;
    assessmentType: string;
    questions: AssessmentQuestion[];
}
