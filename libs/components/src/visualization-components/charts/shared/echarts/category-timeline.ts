import type { TimelineComponentOption } from 'echarts';

import { ChartPalette } from './chart-palette';

/** Horizontal inset of the timeline track from each side of the chart, in pixels. */
const TRACK_INSET = 40;

/** Approximate rendered width of one label character at the default label font, in pixels. */
const CHAR_WIDTH = 7;

/** Fraction of a checkpoint's slot a label may occupy before the next one collides. */
const SLOT_USAGE = 0.9;

/** Smallest character budget a label is ever truncated to, so a stub plus ellipsis remains. */
const MIN_LABEL_CHARS = 4;

/** Character budget used when the available width is unknown (pre-measurement). */
const FALLBACK_LABEL_CHARS = 12;

/**
 * Computes how many characters a checkpoint label may show before it would
 * collide with its neighbour, from the track width shared across the labels.
 * Returns a generous fallback when the width is not yet measured so labels are
 * not trimmed prematurely on the first paint.
 *
 * @param labelCount     Number of checkpoints sharing the track.
 * @param availableWidth Chart width in pixels, or 0 when not yet measured.
 * @returns              Maximum label length in characters.
 */
function maxLabelChars(labelCount: number, availableWidth: number): number {
    if (availableWidth <= 0 || labelCount <= 0) return FALLBACK_LABEL_CHARS;
    const trackWidth = Math.max(0, availableWidth - TRACK_INSET * 2);
    const slotWidth = labelCount > 1 ? trackWidth / (labelCount - 1) : trackWidth;
    return Math.max(MIN_LABEL_CHARS, Math.floor((slotWidth * SLOT_USAGE) / CHAR_WIDTH));
}

/**
 * Builds an ECharts `timeline` configured as a bottom-anchored category picker:
 * playback controls hidden, one labelled checkpoint per item, theme-driven colors.
 *
 * Pair it with the `{ baseOption, options }` ECharts option form — one entry in
 * `options` per label — so dragging a checkpoint swaps the displayed option with
 * no host-side state. Colors are resolved from the supplied palette because the
 * ECharts canvas cannot read `var(--token)` expressions.
 *
 * Labels are truncated only when their checkpoint slot is too narrow to fit them:
 * the budget derives from `availableWidth` divided across the checkpoints, so a
 * wide chart or few levels keep their names in full.
 *
 * @param labels         Checkpoint labels, in display order; index aligns with `options`.
 * @param palette        Resolved theme palette supplying checkpoint, label, and line colors.
 * @param currentIndex   Index of the initially selected checkpoint; defaults to 0.
 * @param availableWidth Chart width in pixels used to size label truncation; 0 (the
 *                       default) keeps labels full until a width is known.
 * @returns              A timeline option ready to place on an ECharts base option.
 */
export function categoryTimeline(
    labels: readonly string[],
    palette: ChartPalette,
    currentIndex = 0,
    availableWidth = 0,
): TimelineComponentOption {
    const charBudget = maxLabelChars(labels.length, availableWidth);
    return {
        axisType: 'category',
        data: [...labels],
        currentIndex,
        autoPlay: false,
        bottom: 6,
        left: TRACK_INSET,
        right: TRACK_INSET,
        controlStyle: { show: false },
        symbolSize: 11,
        lineStyle: { color: palette.gridLine },
        label: {
            color: palette.mutedText,
            interval: 0,
            formatter: (value: string) =>
                value.length > charBudget ? `${value.slice(0, charBudget - 1)}…` : value,
        },
        itemStyle: { color: palette.mutedText },
        checkpointStyle: { color: palette.accent, borderColor: palette.surface },
        emphasis: { label: { color: palette.accent }, itemStyle: { color: palette.accent } },
    };
}
