/** Correctness classification applied to an answer surface's tint. */
export type AnswerCorrectness = 'correct' | 'incorrect' | 'neutral';

/** Default number of avatar faces shown before hover/focus expansion. */
export const DEFAULT_AVATAR_CAP = 5;

/** Visual style of an answer's selection marker. */
export type SelectionMarker = 'radio' | 'checkbox';

/** The kind of highlight a trainee or face carries: the focused trainee (gold) or an answer's choosers (blue). */
export type HighlightKind = 'trainee' | 'answer';

/** Emphasis a face carries: no ring, or the ring of one highlight kind. */
export type FaceEmphasis = 'none' | HighlightKind;

/** One trainee's avatar entry within an avatar-stack. */
export interface AvatarFace {
    /** Training run identifier of the trainee this face represents. */
    readonly runId: number;
    /** Trainee display name, used for the no-picture initial and tooltips. */
    readonly name: string;
    /** Raw base64-encoded avatar image without a data-URL prefix; empty when none. */
    readonly picture: string;
    /** Ring emphasis drawn around this face. */
    readonly emphasis: FaceEmphasis;
}
