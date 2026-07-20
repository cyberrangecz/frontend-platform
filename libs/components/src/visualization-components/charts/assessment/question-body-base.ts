import { Directive, input, output } from '@angular/core';
import { AnswerCorrectness } from '../shared';
import { QuestionBodyContext } from './answer-faces';

/**
 * Resolves the correctness tint of an option or cell: neutral when the
 * assessment is not scored, otherwise correct or incorrect per the given flag.
 *
 * @param scored Whether the owning assessment is scored.
 * @param isCorrect Whether this option or cell is part of the correct answer.
 * @returns The tint to render on the answer surface.
 */
export function correctnessTint(scored: boolean, isCorrect: boolean): AnswerCorrectness {
    return scored ? (isCorrect ? 'correct' : 'incorrect') : 'neutral';
}

/**
 * Shared input/output surface of every question body. Each concrete body extends
 * this and declares only its own typed `question` input and its row projection.
 */
@Directive()
export abstract class QuestionBodyBase {
    /** The trainee lookup and focused-trainee selection shared by every question body. */
    readonly context = input.required<QuestionBodyContext>();

    /** Key of the currently highlighted answer, or null when none is active. */
    readonly activeKey = input<string | null>(null);

    /** Emits the key of the answer whose surface was clicked. */
    readonly answerActivated = output<string>();

    /** Emits the run id of a clicked chooser face. */
    readonly faceActivated = output<number>();
}
