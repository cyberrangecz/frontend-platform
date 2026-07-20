import { PlatformEventType } from '@crczp/visualization-model';
import { eventTypeColors } from '../shared';
import {
    EMPTY_VM,
    EventTimelineVm,
    TimelineCommand,
    TimelineIcon,
    TimelineMarker,
} from './event-timeline.model';

/** Trailing padding past the run end so the last marker never sits on the right border. */
export const TIMELINE_PADDING_MS = 60_000;

/** Maximum characters of free text rendered inline in a tooltip; full text lives in the CSV. */
export const TIMELINE_TEXT_MAX = 256;

/** Marker event types rendered as icon glyphs on the events lane, in ascending draw order. */
export const TIMELINE_MARKER_TYPES: readonly PlatformEventType[] = [
    PlatformEventType.TRAINING_RUN_STARTED,
    PlatformEventType.TRAINING_RUN_RESUMED,
    PlatformEventType.ASSESSMENT_ANSWERS,
    PlatformEventType.CORRECT_ANSWER_SUBMITTED,
    PlatformEventType.WRONG_ANSWER_SUBMITTED,
    PlatformEventType.HINT_TAKEN,
    PlatformEventType.SOLUTION_DISPLAYED,
    PlatformEventType.TRAINING_RUN_ENDED,
];

/** Material Icons ligature and display label per marker type, mirroring the progress vocabulary. */
const MARKER_META = new Map<PlatformEventType, { readonly glyph: string; readonly label: string }>([
    [PlatformEventType.WRONG_ANSWER_SUBMITTED, { glyph: 'cancel', label: 'Wrong answer' }],
    [PlatformEventType.CORRECT_ANSWER_SUBMITTED, { glyph: 'check_circle', label: 'Correct answer' }],
    [PlatformEventType.HINT_TAKEN, { glyph: 'lightbulb', label: 'Hint taken' }],
    [PlatformEventType.SOLUTION_DISPLAYED, { glyph: 'visibility', label: 'Solution displayed' }],
    [PlatformEventType.ASSESSMENT_ANSWERS, { glyph: 'question_answer', label: 'Assessment answers' }],
    [PlatformEventType.TRAINING_RUN_STARTED, { glyph: 'login', label: 'Run started' }],
    [PlatformEventType.TRAINING_RUN_RESUMED, { glyph: 'login', label: 'Run resumed' }],
    [PlatformEventType.TRAINING_RUN_ENDED, { glyph: 'logout', label: 'Run ended' }],
]);

/**
 * Resolves a marker's Material Icons glyph and the foreground/background colours from the
 * shared event-type palette.
 *
 * @param type  The marker event type.
 * @returns The glyph and colour pair for the marker.
 */
export function timelineEventIcon(type: PlatformEventType): TimelineIcon {
    const colors = eventTypeColors(type);
    return { glyph: MARKER_META.get(type)?.glyph ?? 'circle', color: colors.color, bgColor: colors.bgColor };
}

/**
 * Returns the display label for a marker event type.
 *
 * @param type  The marker event type.
 * @returns The label, falling back to the raw type when unmapped.
 */
export function timelineEventLabel(type: PlatformEventType): string {
    return MARKER_META.get(type)?.label ?? String(type);
}

/** Base for every timestamped event row. */
interface TimestampRow {
    readonly timestamp: number;
}

/** Base for level-scoped event rows. */
interface LevelEventRow extends TimestampRow {
    readonly level_order: number;
}

/** training_run_started: start time, owner, and sandbox. */
export interface RunStartedRow extends TimestampRow {
    readonly user_ref_id: number;
    readonly sandbox_id: string;
}

/** training_run_ended: end event time and the canonical end timestamp. */
export interface RunEndedRow extends TimestampRow {
    readonly end_time: number;
}

/** level_started: level order, entry time, and sandbox for attribution. */
export interface LevelStartedRow extends LevelEventRow {
    readonly sandbox_id: string;
}

/** wrong_answer_submitted. */
export interface WrongRow extends LevelEventRow {
    readonly answer_content: string;
    readonly count: number;
}

/** correct_answer_submitted. */
export interface CorrectRow extends LevelEventRow {
    readonly answer_content: string;
}

/** hint_taken. */
export interface HintRow extends LevelEventRow {
    readonly hint_title: string;
    readonly hint_penalty_points: number;
}

/** solution_displayed. */
export interface SolutionRow extends LevelEventRow {
    readonly penalty_points: number;
}

/** One command row, scoped to the run by sandbox membership. */
export interface CommandRawRow extends TimestampRow {
    readonly command: string;
    readonly command_arguments: string | null;
    readonly sandbox_id: string;
    readonly cmd_type: string;
    readonly hostname: string | null;
    readonly username: string | null;
    readonly wd: string | null;
    readonly ip: string | null;
}

/** All raw sub-query results for one run, gathered in a single polling cycle. */
export interface EventTimelineAggregate {
    readonly runStarted: readonly RunStartedRow[];
    readonly runEnded: readonly RunEndedRow[];
    readonly runResumed: readonly TimestampRow[];
    readonly levelStarted: readonly LevelStartedRow[];
    readonly wrong: readonly WrongRow[];
    readonly correct: readonly CorrectRow[];
    readonly hint: readonly HintRow[];
    readonly solution: readonly SolutionRow[];
    readonly assessment: readonly LevelEventRow[];
    readonly commands: readonly CommandRawRow[];
}

/** Empty aggregate emitted when no run is selected. */
export const EMPTY_AGGREGATE: EventTimelineAggregate = {
    runStarted: [],
    runEnded: [],
    runResumed: [],
    levelStarted: [],
    wrong: [],
    correct: [],
    hint: [],
    solution: [],
    assessment: [],
    commands: [],
};

/** Optional per-marker detail fields. */
type MarkerDetail = Partial<
    Pick<TimelineMarker, 'answerText' | 'submissionCount' | 'hintTitle' | 'penaltyPoints'>
>;

/**
 * Maps a string to a stable unit value in [0, 1) via an FNV-1a hash, seeding deterministic
 * command jitter so a circle keeps its vertical position across live polls.
 *
 * @param value  The string to hash.
 * @returns A deterministic number in [0, 1).
 */
function hashUnit(value: string): number {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return ((hash >>> 0) % 100_000) / 100_000;
}

/**
 * Builds an offset-into-run resolver and earliest-entry map from the run's level starts.
 *
 * @param starts           The run's level_started rows.
 * @param runStartTimestamp The run's start timestamp.
 * @returns A level-at-timestamp lookup and the earliest entry offset per level order.
 */
function levelTimeline(
    starts: readonly LevelStartedRow[],
    runStartTimestamp: number,
): { levelAt: (timestamp: number) => number | null; startsByOrder: ReadonlyMap<number, number> } {
    const startsByOrder = new Map<number, number>();
    for (const row of starts) {
        const offset = row.timestamp - runStartTimestamp;
        const previous = startsByOrder.get(row.level_order);
        if (previous === undefined || offset < previous) startsByOrder.set(row.level_order, offset);
    }

    const ordered = [...starts].sort((left, right) => left.timestamp - right.timestamp);
    const levelAt = (timestamp: number): number | null => {
        let order: number | null = ordered[0]?.level_order ?? null;
        for (const row of ordered) {
            if (row.timestamp > timestamp) break;
            order = row.level_order;
        }
        return order;
    };

    return { levelAt, startsByOrder };
}

/**
 * Reduces the raw aggregate to the timeline view model: resolves the run window, scopes
 * commands to the run's sandboxes, attributes each command to its active level, and
 * flattens every event into one chronologically ordered marker list.
 *
 * @param aggregate  Combined query output for one run.
 * @returns The timeline view model, or the empty model when the run has no start row.
 */
export function buildEventTimelineVm(aggregate: EventTimelineAggregate): EventTimelineVm {
    const started = aggregate.runStarted[0];
    if (started === undefined) return EMPTY_VM;

    const runStartTimestamp = started.timestamp;
    const ended = aggregate.runEnded[0];
    const { levelAt, startsByOrder } = levelTimeline(aggregate.levelStarted, runStartTimestamp);

    const sandboxes = new Set<string>([started.sandbox_id]);
    for (const row of aggregate.levelStarted) sandboxes.add(row.sandbox_id);

    const marker = (
        type: PlatformEventType,
        timestamp: number,
        levelOrder: number | null,
        detail: MarkerDetail = {},
    ): TimelineMarker => ({
        type,
        timestamp,
        offsetMs: timestamp - runStartTimestamp,
        levelOrder,
        answerText: detail.answerText ?? null,
        submissionCount: detail.submissionCount ?? null,
        hintTitle: detail.hintTitle ?? null,
        penaltyPoints: detail.penaltyPoints ?? null,
    });

    const runStartedMarker = marker(PlatformEventType.TRAINING_RUN_STARTED, runStartTimestamp, null);
    const runResumedMarkers = aggregate.runResumed.map((row) =>
        marker(PlatformEventType.TRAINING_RUN_RESUMED, row.timestamp, null),
    );
    const runEndedMarkers = ended ? [marker(PlatformEventType.TRAINING_RUN_ENDED, ended.timestamp, null)] : [];
    const wrongMarkers = aggregate.wrong.map((row) =>
        marker(PlatformEventType.WRONG_ANSWER_SUBMITTED, row.timestamp, row.level_order, {
            answerText: row.answer_content,
            submissionCount: row.count,
        }),
    );
    const correctMarkers = aggregate.correct.map((row) =>
        marker(PlatformEventType.CORRECT_ANSWER_SUBMITTED, row.timestamp, row.level_order, {
            answerText: row.answer_content,
        }),
    );
    const hintMarkers = aggregate.hint.map((row) =>
        marker(PlatformEventType.HINT_TAKEN, row.timestamp, row.level_order, {
            hintTitle: row.hint_title,
            penaltyPoints: row.hint_penalty_points,
        }),
    );
    const solutionMarkers = aggregate.solution.map((row) =>
        marker(PlatformEventType.SOLUTION_DISPLAYED, row.timestamp, row.level_order, {
            penaltyPoints: row.penalty_points,
        }),
    );
    const assessmentMarkers = aggregate.assessment.map((row) =>
        marker(PlatformEventType.ASSESSMENT_ANSWERS, row.timestamp, row.level_order),
    );

    const markers = [
        runStartedMarker,
        ...runResumedMarkers,
        ...runEndedMarkers,
        ...wrongMarkers,
        ...correctMarkers,
        ...hintMarkers,
        ...solutionMarkers,
        ...assessmentMarkers,
    ].sort((left, right) => left.offsetMs - right.offsetMs);

    const commands = aggregate.commands
        .filter((row) => sandboxes.has(row.sandbox_id))
        .map((row): TimelineCommand => {
            const commandArguments = row.command_arguments ?? '';
            return {
                tool: row.command,
                commandArguments,
                timestamp: row.timestamp,
                offsetMs: row.timestamp - runStartTimestamp,
                levelOrder: levelAt(row.timestamp),
                commandType: row.cmd_type,
                hostname: row.hostname,
                username: row.username,
                workingDirectory: row.wd,
                ipAddress: row.ip,
                jitter: hashUnit(`${row.sandbox_id}|${row.timestamp}|${row.command}|${commandArguments}`),
            };
        })
        .sort((left, right) => left.offsetMs - right.offsetMs);

    return {
        runStartTimestamp,
        runEndTimestamp: ended?.end_time ?? null,
        userId: started.user_ref_id,
        markers,
        commands,
        startsByOrder,
    };
}
