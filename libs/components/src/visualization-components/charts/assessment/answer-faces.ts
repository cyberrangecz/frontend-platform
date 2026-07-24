import { AnswerCorrectness, AvatarFace, HighlightKind } from '../shared';
import { AnswerDistribution, TraineeIdentity } from './assessment-view.model';

export type { HighlightKind };

/** The run-id payload each highlight kind carries, keyed by {@link HighlightKind}. */
interface HighlightPayloads extends Record<HighlightKind, object> {
    readonly trainee: { readonly runId: number };
    readonly answer: { readonly runIds: ReadonlySet<number> };
}

/**
 * The active trainee highlight shared by the roster and the question bodies. An answer
 * highlight rings the choosers of a selected common answer in blue; a trainee highlight
 * rings a single focused trainee in gold.
 */
export type TraineeHighlight = {
    readonly [Kind in HighlightKind]: {
        readonly kind: Kind;
    } & HighlightPayloads[Kind];
}[HighlightKind];

/**
 * Resolves the emphasis a highlight applies to one trainee.
 *
 * @param highlight The active trainee highlight, or null when nothing is highlighted.
 * @param runId The trainee's run id.
 * @returns The highlight's kind when the trainee is a member, otherwise null.
 */
export function emphasisFor(
    highlight: TraineeHighlight | null,
    runId: number,
): HighlightKind | null {
    if (!highlight) {
        return null;
    }
    if (highlight.kind === 'trainee') {
        return highlight.runId === runId ? 'trainee' : null;
    }
    return highlight.runIds.has(runId) ? 'answer' : null;
}

/**
 * Determines whether a trainee is dimmed by the active highlight: only an answer
 * highlight dims its non-choosers, since a trainee highlight does not mute the rest.
 *
 * @param highlight The active trainee highlight, or null when nothing is highlighted.
 * @param runId The trainee's run id.
 * @returns Whether the trainee should render dimmed.
 */
export function isDimmed(
    highlight: TraineeHighlight | null,
    runId: number,
): boolean {
    return highlight?.kind === 'answer' && !highlight.runIds.has(runId);
}

/**
 * The shared context every question body needs to render its answers: who the
 * trainees are, the active avatar highlight, and whether the assessment is scored.
 */
export interface QuestionBodyContext {
    /** Trainee identities keyed by run id, the lookup for chooser faces. */
    readonly traineesByRunId: ReadonlyMap<number, TraineeIdentity>;
    /** The active trainee highlight, or null when nothing is highlighted. */
    readonly highlight: TraineeHighlight | null;
    /** Whether the owning assessment is scored, enabling correctness tints. */
    readonly scored: boolean;
}

/**
 * The distribution-derived fields an answer surface consumes, shared by MCQ
 * options, EMI cells, and FFQ rows so each body adds only its own key and label.
 */
export interface AnswerRowView {
    /** Correctness tint: definition-based when scored, neutral otherwise. */
    readonly correctness: AnswerCorrectness;
    /** Whether the focused trainee chose this answer (fills the marker, rings gold). */
    readonly focusedTraineeChose: boolean;
    /** Number of trainees who chose this answer. */
    readonly count: number;
    /** Share of respondents who chose this answer, 0 to 100. */
    readonly percent: number;
    /** Faces of the trainees who chose this answer. */
    readonly faces: readonly AvatarFace[];
}

/**
 * Builds the avatar faces for one answer's distribution, resolving each chooser's
 * run id against the trainee lookup and ringing the faces named by the active
 * highlight with its ring. The same highlight applies across every question, so a
 * highlighted trainee's face is ringed wherever it appears. Run ids missing from
 * the lookup are skipped, preserving the distribution order.
 *
 * @param distribution The answer's chooser run ids, in the model's trainee order.
 * @param traineesByRunId Trainee identities keyed by run id, the lookup for name and picture.
 * @param highlight The active trainee highlight, or null when nothing is highlighted.
 * @returns One face per resolvable chooser, in distribution order.
 */
function toAvatarFaces(
    distribution: AnswerDistribution,
    traineesByRunId: ReadonlyMap<number, TraineeIdentity>,
    highlight: TraineeHighlight | null,
): readonly AvatarFace[] {
    const faces: AvatarFace[] = [];
    for (const runId of distribution.chooserRunIds) {
        const trainee = traineesByRunId.get(runId);
        if (!trainee) {
            continue;
        }
        faces.push({
            runId,
            name: trainee.name,
            picture: trainee.picture,
            emphasis: emphasisFor(highlight, runId) ?? 'none',
        });
    }
    return faces;
}

/**
 * Projects one answer's distribution onto the fields an answer surface consumes.
 * The focused-trainee-choice marker fills only when a trainee highlight is active and that
 * trainee is among this answer's resolved faces, so it never disagrees with the
 * resolved faces about whether the focused trainee chose this answer.
 *
 * @param distribution The answer's chooser run ids, counts, and share.
 * @param correctness Correctness tint applied to the resulting row.
 * @param context The trainee lookup, active highlight, and scoring the faces resolve against.
 * @returns The surface-ready view of the answer.
 */
export function toAnswerRow(
    distribution: AnswerDistribution,
    correctness: AnswerCorrectness,
    context: QuestionBodyContext,
): AnswerRowView {
    const { highlight } = context;
    const faces = toAvatarFaces(distribution, context.traineesByRunId, highlight);
    return {
        correctness,
        focusedTraineeChose:
            highlight?.kind === 'trainee' &&
            faces.some((face) => face.runId === highlight.runId),
        count: distribution.count,
        percent: distribution.percent * 100,
        faces,
    };
}
