import { format } from 'date-fns';
import { CallbackDataParams } from 'echarts/types/dist/shared';
import { BarTooltipPayload } from './bars/bars.builder';
import { EventKind, EventVm } from '../types/event.types';
import {
    ESTIMATE_GAIN_COLOR,
    ESTIMATE_LOSS_COLOR,
    LAG_STATE_COLORS,
    LAG_STATE_LABELS,
} from '../config/lag.config';
import { EVENT_ICON_CATALOG } from '../config/event.config';
import { OptionFragment } from '../types/option-fragment.types';
import { ChartPalette, renderRichTooltipHtml, richTooltipDefaults, RichTooltipModel, RichTooltipRow } from '../../shared';

/**
 * Bar data tuple: [startMs, endMs, rowIndex, BarTooltipPayload].
 * Discriminated by `data.length >= 4` and `data[3].kind === 'bar'`.
 */
interface BarDataTuple {
    readonly 0: number;
    readonly 1: number;
    readonly 2: number;
    readonly 3: BarTooltipPayload;
}

/**
 * Event data tuple: [timestamp, rowIndex, EventVm & { barKey }].
 * Discriminated by `data.length === 3` and `typeof data[2].kind === 'string'`.
 */
interface EventDataTuple {
    readonly 0: number;
    readonly 1: number;
    readonly 2: EventVm;
}

/** Bar discriminator: 4-tuple with `.kind === 'bar'` on data[3]. */
function isBarData(data: unknown): data is BarDataTuple {
    return (
        Array.isArray(data) &&
        data.length >= 4 &&
        (data[3] as Partial<BarTooltipPayload>).kind === 'bar'
    );
}

/** Event discriminator: 3-tuple with string `.kind` on data[2]. */
function isEventData(data: unknown): data is EventDataTuple {
    return (
        Array.isArray(data) &&
        data.length === 3 &&
        typeof (data[2] as Partial<EventVm>).kind === 'string'
    );
}

const TIME_FORMAT = 'HH:mm:ss';
const DATETIME_FORMAT = 'MMM d, HH:mm:ss';

function fmtTimestamp(milliseconds: number): string {
    return format(milliseconds, TIME_FORMAT);
}

function fmtDatetime(milliseconds: number): string {
    return format(milliseconds, DATETIME_FORMAT);
}

function durationMinutes(startMs: number, endMs: number): string {
    return ((endMs - startMs) / 60_000).toFixed(1);
}

/** Minute delta below which the elapsed duration reads as on the estimate. */
const ESTIMATE_DELTA_NEUTRAL_MINUTES = 0.05;

/**
 * Builds the colour-coded "vs estimate" row comparing elapsed duration to the
 * level's estimated duration. Time saved reads as a gain (ahead, green), time
 * overrun as a loss (behind, red), and a sub-threshold delta as on the
 * estimate. Returns null when the level carries no estimate.
 *
 * @param startMs             Level start timestamp (epoch ms).
 * @param endMs               Effective end timestamp (epoch ms); the live clock
 *                            for a running level, the completion time otherwise.
 * @param estimatedDurationMs Estimated level duration (ms), or null when unset.
 * @returns The tooltip row, or null when no estimate exists.
 */
function estimateDeltaRow(
    startMs: number,
    endMs: number,
    estimatedDurationMs: number | null,
): RichTooltipRow | null {
    if (estimatedDurationMs == null || estimatedDurationMs <= 0) {
        return null;
    }
    const deltaMinutes = (endMs - startMs - estimatedDurationMs) / 60_000;
    const magnitude = Math.abs(deltaMinutes).toFixed(1);
    if (Math.abs(deltaMinutes) < ESTIMATE_DELTA_NEUTRAL_MINUTES) {
        return { label: 'Δestimate', value: 'on estimate' };
    }
    const behind = deltaMinutes > 0;
    return {
        label: 'Δestimate',
        value: `${behind ? '+' : '−'}${magnitude} min ${behind ? 'behind' : 'ahead'}`,
        valueColor: behind ? ESTIMATE_LOSS_COLOR : ESTIMATE_GAIN_COLOR,
    };
}

/**
 * Builds the bar-segment tooltip model from `BarTooltipPayload` (data[3]).
 *
 * The level title heads the surface; the lag state rides the first detail row,
 * coloured by its state, followed by the trainee, timing, estimate, and score.
 */
function buildBarTooltipModel(payload: BarTooltipPayload): RichTooltipModel {
    const endLabel = payload.isRunning ? 'running…' : fmtTimestamp(payload.endMs);
    const durationLabel = `${durationMinutes(payload.startMs, payload.endMs)} min${payload.isRunning ? ' (in progress)' : ''}`;

    const rows: RichTooltipRow[] = [
        {
            label: 'Status',
            value: LAG_STATE_LABELS[payload.lagState],
            valueColor: LAG_STATE_COLORS[payload.lagState],
        },
        { label: 'Trainee', value: payload.traineeDisplayName },
        { label: 'Started', value: fmtTimestamp(payload.startMs) },
        { label: 'Ended', value: endLabel },
        { label: 'Duration', value: durationLabel },
    ];

    const estimateRow = estimateDeltaRow(payload.startMs, payload.endMs, payload.estimatedDurationMs);
    if (estimateRow !== null) {
        rows.push(estimateRow);
    }

    if (payload.scoreOnCompletion != null) {
        rows.push({ label: 'Score', value: String(payload.scoreOnCompletion) });
    }

    return { title: payload.levelTitle, rows };
}

/** Title shown in the event tooltip header per event kind. */
const EVENT_KIND_LABELS: Readonly<Record<EventKind, string>> = {
    WRONG_ANSWER: 'Wrong Answer',
    CORRECT_ANSWER: 'Correct Answer',
    HINT_TAKEN: 'Hint Taken',
    SOLUTION_DISPLAYED: 'Solution Displayed',
    ASSESSMENT_ANSWERS: 'Assessment Answer',
    TRAINING_RUN_STARTED: 'Run Started',
    TRAINING_RUN_RESUMED: 'Run Resumed',
    TRAINING_RUN_ENDED: 'Run Ended',
} as const;

/** Detail-row label for the kinds that carry a detail value. */
const EVENT_DETAIL_LABELS: Partial<Record<EventKind, string>> = {
    WRONG_ANSWER: 'Answer',
    CORRECT_ANSWER: 'Answer',
    HINT_TAKEN: 'Hint',
};

/**
 * Builds the event-icon tooltip model from `EventVm` (data[2]).
 *
 * The kind heads the surface in its semantic colour and icon (e.g. a red
 * "Wrong Answer" with a cancel glyph). The detail line — answer text or hint
 * title — is added only when present; the timestamp always closes the surface.
 */
function buildEventTooltipModel(eventVm: EventVm): RichTooltipModel {
    const descriptor = EVENT_ICON_CATALOG[eventVm.kind];
    const rows: RichTooltipRow[] = [];

    if (eventVm.detail) {
        rows.push({
            label: EVENT_DETAIL_LABELS[eventVm.kind] ?? 'Detail',
            value: eventVm.detail,
        });
    }
    rows.push({ label: 'Time', value: fmtDatetime(eventVm.timestamp) });

    return {
        title: EVENT_KIND_LABELS[eventVm.kind],
        titleColor: descriptor.color,
        titleIcon: descriptor.icon,
        rows,
    };
}

/**
 * Returns the global tooltip option fragment.
 *
 * The formatter branches on payload shape and renders the shared rich-tooltip
 * surface, so the native ECharts tooltip chrome is neutralised (transparent
 * background, no border, padding, or shadow) to leave that surface as the only
 * one shown.
 *
 *   - Bar:   `params.data` is a 4-tuple; `data[3].kind === 'bar'`.
 *   - Event: `params.data` is a 3-tuple; `typeof data[2].kind === 'string'`.
 *
 * Returns a non-null fragment; the renderer emits this once at first paint
 * and omits it on subsequent partial updates.
 *
 * @param palette Resolved theme palette forwarded to {@link richTooltipDefaults}.
 */
export function buildTooltipFragment(palette: ChartPalette): OptionFragment {
    return {
        tooltip: {
            ...richTooltipDefaults(palette),
            trigger: 'item',
            formatter: (params: CallbackDataParams) => {
                const data: unknown = params.data;

                if (isBarData(data)) {
                    return renderRichTooltipHtml(buildBarTooltipModel(data[3]));
                }

                if (isEventData(data)) {
                    return renderRichTooltipHtml(buildEventTooltipModel(data[2]));
                }

                return '';
            },
        },
    };
}
