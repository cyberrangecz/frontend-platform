/** Single value a trainee picked or typed, with its correctness where known. */
export interface AnswerSelection {
    value: string | number;
    correct: boolean | null;
}

/** Attributes shared by an answer to any question type. */
export interface EventAnswerBase {
    question_id: number;
    correct: boolean | null;
    points_gained: number;
}

export interface FreeFormEventAnswer extends EventAnswerBase {
    type: 'FFQ';
    answer: AnswerSelection | null;
}

export interface MultipleChoiceEventAnswer extends EventAnswerBase {
    type: 'MCQ';
    selected_options: AnswerSelection[];
}

export interface ExtendedMatchingEventAnswer extends EventAnswerBase {
    type: 'EMI';
    pairs: Record<string, AnswerSelection>;
}

/** Answer to a question of any type, discriminated by its `type` attribute. */
export type EventAnswer = FreeFormEventAnswer | MultipleChoiceEventAnswer | ExtendedMatchingEventAnswer;
