/**
 * Class representing a answer check in task
 */

export class PhaseAnswerCheck {
    isCorrect!: boolean;
    remainingAttempts!: number;
    solution!: string;

    hasRemainingAttempts(): boolean {
        return this.remainingAttempts > 0;
    }
}
