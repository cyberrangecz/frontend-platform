/**
 * Class representing hint in a training level.
 */
export class Hint {
    id!: number;
    title!: string;
    content!: string;
    order!: number;
    valid = true;
    penalty = 0;

    isRevealed(): boolean {
        return this.content !== null && this.content !== undefined;
    }
}
