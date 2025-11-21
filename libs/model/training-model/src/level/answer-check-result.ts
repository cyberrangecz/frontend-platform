/**
 * Class representing a answer check in training level
 */

export class AnswerCheckResult {
    isCorrect!: boolean;
    remainingAttempts!: number;
    solution: string | undefined;

    constructor(
        isCorrect: boolean,
        remainingAttempts: number = Number.MAX_SAFE_INTEGER,
        solution?: string,
    ) {
        this.isCorrect = isCorrect;
        this.remainingAttempts = remainingAttempts;
        this.solution = solution;
    }

    hasRemainingAttempts(): boolean {
        return this.remainingAttempts > 0;
    }
}
