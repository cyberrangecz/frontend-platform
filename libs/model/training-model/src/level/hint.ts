import { Z } from 'zod-class';
import { z } from 'zod';

export class HintBasic extends Z.class({
    id: z.number(),
    title: z.string(),
    penalty: z.number(),
}) {
    declare id: number;
    declare title: string;
    declare penalty: number;
}

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
