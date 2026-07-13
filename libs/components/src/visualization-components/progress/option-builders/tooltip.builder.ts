import { format } from 'date-fns';
import { CallbackDataParams } from 'echarts/types/dist/shared';
import { BarTooltipPayload } from './bars/bars.builder';
import { EventVm } from '../types/event.types';
import { LAG_STATE_COLORS, LAG_STATE_LABELS } from '../config/lag.config';
import { EVENT_ICON_CATALOG } from '../config/event.config';
import { OptionFragment } from '../types/option-fragment.types';
import { LagState } from '../types/lag-state.types';

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

/**
 * FIX 1 + FIX 3 — Bar discriminator: 4-tuple with `.kind === 'bar'` on data[3].
 * Array length differentiates from the 3-tuple event shape.
 */
function isBarData(data: unknown): data is BarDataTuple {
    return (
        Array.isArray(data) &&
        data.length >= 4 &&
        (data[3] as Partial<BarTooltipPayload>).kind === 'bar'
    );
}

/**
 * FIX 2 + FIX 3 — Event discriminator: 3-tuple with string `.kind` on data[2].
 * Exact length === 3 differentiates from the 4-tuple bar shape.
 */
function isEventData(data: unknown): data is EventDataTuple {
    return (
        Array.isArray(data) &&
        data.length === 3 &&
        typeof (data[2] as Partial<EventVm>).kind === 'string'
    );
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const TIME_FORMAT = 'HH:mm:ss';
const DATETIME_FORMAT = "MMM d, HH:mm:ss";

function fmtTimestamp(milliseconds: number): string {
    return format(milliseconds, TIME_FORMAT);
}

function fmtDatetime(milliseconds: number): string {
    return format(milliseconds, DATETIME_FORMAT);
}

function durationMinutes(startMs: number, endMs: number): string {
    return ((endMs - startMs) / 60_000).toFixed(1);
}

function tooltipRow(label: string, value: string): string {
    return `<div class="tooltip-row"><span class="tooltip-label">${label}:</span> <span class="tooltip-value">${value}</span></div>`;
}

/**
 * Lag state badge. Background color is dynamic (lag-state-driven) so it
 * stays inline; static layout rules live in the component SCSS.
 */
function lagStateBadge(lagState: LagState): string {
    const color = LAG_STATE_COLORS[lagState];
    const label = LAG_STATE_LABELS[lagState];
    return (
        `<span class="tooltip-lag-badge" style="background:${color};">${label}</span>`
    );
}

/**
 * FIX 1 — Builds the bar-segment tooltip HTML from BarTooltipPayload (data[3]).
 *
 * Reads all fields directly from payload — no optional cast needed.
 * traineeDisplayName is a real field on BarTooltipPayload.
 * Time fields use payload.startMs / payload.endMs per WP2 final contract.
 */
function buildBarTooltipHtml(payload: BarTooltipPayload): string {
    const endLabel = payload.isRunning ? 'running…' : fmtTimestamp(payload.endMs);
    const durationLabel = `${durationMinutes(payload.startMs, payload.endMs)} min${payload.isRunning ? ' (in progress)' : ''}`;

    const traineeRow = tooltipRow('Trainee', escapeHtml(payload.traineeDisplayName));
    const scoreRow =
        payload.scoreOnCompletion != null
            ? tooltipRow('Score', String(payload.scoreOnCompletion))
            : '';

    return [
        `<div class="tooltip">`,
        `<div class="tooltip-header">${escapeHtml(payload.levelTitle)}</div>`,
        `<div class="tooltip-badge-row">${lagStateBadge(payload.lagState)}</div>`,
        traineeRow,
        tooltipRow('Started', fmtTimestamp(payload.startMs)),
        tooltipRow('Ended', endLabel),
        tooltipRow('Duration', durationLabel),
        scoreRow,
        `</div>`,
    ]
        .filter(Boolean)
        .join('');
}

const EVENT_KIND_LABELS: Readonly<Record<string, string>> = {
    WRONG_ANSWER: 'Wrong Answer',
    CORRECT_ANSWER: 'Correct Answer',
    HINT_TAKEN: 'Hint Taken',
    SOLUTION_DISPLAYED: 'Solution Displayed',
    ASSESSMENT_ANSWERS: 'Assessment Answer',
    TRAINING_RUN_STARTED: 'Run Started',
    TRAINING_RUN_RESUMED: 'Run Resumed',
    TRAINING_RUN_ENDED: 'Run Ended',
} as const;

/**
 * FIX 2 — Builds the event-icon tooltip HTML from EventVm (data[2], flat).
 *
 * data[2] is flat EventVm + barKey — kind, tooltipLabel, timestamp, and
 * barKey are all top-level fields.
 *
 * Event header color is dynamic (event-kind-driven) so it stays inline;
 * all static structural styles live in the component SCSS via ::ng-deep.
 */
function buildEventTooltipHtml(eventVm: EventVm): string {
    const descriptor = EVENT_ICON_CATALOG[eventVm.kind];
    const kindLabel = EVENT_KIND_LABELS[eventVm.kind] ?? eventVm.kind;

    return [
        `<div class="tooltip">`,
        `<div class="tooltip-header tooltip-header--event" style="color:${escapeHtml(descriptor.color)};">`,
        `<span class="tooltip-event-icon">${descriptor.icon}</span>`,
        escapeHtml(kindLabel),
        `</div>`,
        `<div class="tooltip-event-label">${escapeHtml(eventVm.tooltipLabel)}</div>`,
        tooltipRow('Time', fmtDatetime(eventVm.timestamp)),
        `</div>`,
    ]
        .filter(Boolean)
        .join('');
}

/**
 * Returns the global tooltip option fragment.
 *
 * The formatter branches on payload shape:
 *   - Bar:   `params.data` is a 4-tuple; `data[3].kind === 'bar'` (FIX 1 + 3)
 *   - Event: `params.data` is a 3-tuple; `typeof data[2].kind === 'string'` (FIX 2 + 3)
 *
 * Returns a non-null fragment; the renderer emits this once at first paint
 * and omits it on subsequent partial updates.
 */
export function buildTooltipFragment(): OptionFragment {

    return {
        key: 'tooltip',
        fragment: {
            tooltip: {
                trigger: 'item',
                borderColor: 'transparent',
                formatter: (params: CallbackDataParams) => {
                    const data: unknown = params.data;

                    if (isBarData(data)) {
                        return buildBarTooltipHtml(data[3]);
                    }

                    if (isEventData(data)) {
                        return buildEventTooltipHtml(data[2]);
                    }

                    return '';
                },
            },
        },
    };
}
