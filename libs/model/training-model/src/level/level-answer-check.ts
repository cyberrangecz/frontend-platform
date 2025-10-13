/**
 * Class representing a answer check in training level
 */

export class LevelAnswerCheck {
    isCorrect!: boolean;
    remainingAttempts!: number;
    solution!: string;

    hasRemainingAttempts(): boolean {
        return this.remainingAttempts > 0;
    }
}
