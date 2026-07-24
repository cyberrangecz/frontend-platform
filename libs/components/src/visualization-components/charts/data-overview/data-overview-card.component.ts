import { ChangeDetectionStrategy, Component, computed, inject, input, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EntityResolverService } from '@crczp/event-query-engine';
import {
    differenceInMilliseconds,
    format,
    formatDuration,
    intervalToDuration,
    isAfter,
} from 'date-fns';
import { Utils } from '@crczp/utils';
import { cappedRunDurationMs, ChartSourceStatus, createInstanceClock, PALETTE, QuerySource } from '../shared';
import {
    buildStaticStream,
    createLiveOverviewSource,
    LiveOverviewVm,
    StaticOverviewVm,
} from './data-overview-source';

/** One coloured part of a tile value. */
interface StatValueSegment {
    readonly text: string;
    /** Inline segment colour, or null to inherit the default value colour. */
    readonly color: string | null;
}

/** A single labelled statistic rendered as one tile of the overview grid. */
interface StatTile {
    readonly label: string;
    readonly value: string;
    readonly caption: string | null;
    /** Inline value colour, or null/omitted to inherit the default value colour. */
    readonly color?: string | null;
    /** Coloured value parts; when present they render in place of the plain value. */
    readonly segments?: readonly StatValueSegment[];
}

const EMPTY_VALUE = '—';

/** Polling interval in milliseconds for the clock-driven `now` signal. */
const CLOCK_INTERVAL_MS = 30_000;

/** Remaining time at or below which the Time remaining value turns orange. */
const TIME_REMAINING_WARN_MS = 15 * 60_000;

/** Remaining time at or below which the Time remaining value turns red. */
const TIME_REMAINING_CRITICAL_MS = 5 * 60_000;

/** Amber used for hint indicators; darker than the palette yellow for legibility on light surfaces. */
const HINT_COLOR = '#a98700';

@Component({
    selector: 'crczp-data-overview-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    templateUrl: './data-overview-card.component.html',
    styleUrl: './data-overview-card.component.scss',
})
export class DataOverviewCardComponent {
    readonly instanceId = input.required<number>();

    private readonly entityResolver = inject(EntityResolverService);

    private readonly staticVm: Signal<StaticOverviewVm | null> = toSignal(
        buildStaticStream(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    private readonly liveSource: QuerySource<LiveOverviewVm> = createLiveOverviewSource(this.instanceId);

    /** Wall clock driving the Status and Time-remaining tiles; stops once the instance closes. */
    private readonly now: Signal<number> = createInstanceClock(
        CLOCK_INTERVAL_MS,
        () => this.staticVm()?.instance.endTime,
    );

    protected readonly tiles = computed<readonly StatTile[]>(() => this.buildTiles());
    protected readonly cardStatus = computed(() => this.computeCardStatus());

    /**
     * Assembles the ordered list of statistic tiles rendered by the grid.
     * Returns exactly 8 tiles in the canonical display order.
     */
    private buildTiles(): StatTile[] {
        return [
            this.scheduleTile(),
            this.statusTile(),
            this.timeRemainingTile(),
            this.traineesTile(),
            this.mostCommonLevelTile(),
            this.avgDurationTile(),
            this.averageScoreTile(),
            this.hintsSolutionsTile(),
        ];
    }

    /** Scheduled window: dates as the value, start–end times as the caption. */
    private scheduleTile(): StatTile {
        const staticVm = this.staticVm();
        if (!staticVm) return { label: 'Schedule', value: EMPTY_VALUE, caption: null };
        const { startTime, endTime } = staticVm.instance;
        return {
            label: 'Schedule',
            value: `${format(startTime, 'MMM d')} – ${format(endTime, 'MMM d')}`,
            caption: `${format(startTime, 'HH:mm')} – ${format(endTime, 'HH:mm')}`,
        };
    }

    /** Whether the instance has passed its scheduled end, updated by the clock signal. */
    private statusTile(): StatTile {
        const staticVm = this.staticVm();
        if (!staticVm) return { label: 'Status', value: EMPTY_VALUE, caption: null };
        const finished = isAfter(this.now(), staticVm.instance.endTime);
        return {
            label: 'Status',
            value: finished ? 'Finished' : 'Running',
            caption: null,
            color: finished ? PALETTE.green.color : PALETTE.blue.color,
        };
    }

    /**
     * Time remaining until the instance end, updated by the clock signal.
     * Shows the coarse remaining duration (e.g. `6h 12m`) and the total window
     * as the caption (e.g. `of 2d`). When the end has passed, value is `Ended`
     * and caption is null.
     */
    private timeRemainingTile(): StatTile {
        const staticVm = this.staticVm();
        if (!staticVm) return { label: 'Time remaining', value: EMPTY_VALUE, caption: null };
        const { startTime, endTime } = staticVm.instance;
        const nowMs = this.now();

        if (isAfter(nowMs, endTime)) {
            return { label: 'Time remaining', value: 'Ended', caption: null };
        }

        const remainingMs = differenceInMilliseconds(endTime, nowMs);
        const totalMs = differenceInMilliseconds(endTime, startTime);

        return {
            label: 'Time remaining',
            value: this.formatDurationCoarse(remainingMs),
            caption: `of ${this.formatDurationCoarse(totalMs)}`,
            color: this.timeRemainingColor(remainingMs),
        };
    }

    /**
     * Colour for the remaining-time value: red at or below the critical threshold,
     * orange at or below the warning threshold, otherwise null to inherit the default.
     *
     * @param remainingMs Milliseconds remaining until the instance end.
     */
    private timeRemainingColor(remainingMs: number): string | null {
        if (remainingMs <= TIME_REMAINING_CRITICAL_MS) return PALETTE.red.color;
        if (remainingMs <= TIME_REMAINING_WARN_MS) return PALETTE.deepOrange.color;
        return null;
    }

    /**
     * Merged participation tile showing total trainees with active/finished breakdown.
     * Caption format: `{active} active · {finished} done ({percent}%)`.
     * When no trainees have started, value is `0` and caption is null.
     */
    private traineesTile(): StatTile {
        const liveVm = this.liveSource.vm();
        if (!liveVm) return { label: 'Trainees', value: EMPTY_VALUE, caption: null };
        if (liveVm.traineeCount === 0) return { label: 'Trainees', value: '0', caption: null };

        const active = liveVm.activeRunIds.size;
        const finished = liveVm.finishedCount;
        const percent = Math.round((finished / liveVm.traineeCount) * 100);

        return {
            label: 'Trainees',
            value: String(liveVm.traineeCount),
            caption: `${active} active · ${finished} done (${percent}%)`,
        };
    }

    /**
     * Most-common current level across active runs, shown by resolved level name
     * with the 1-based order and level count as the caption.
     */
    private mostCommonLevelTile(): StatTile {
        if (!this.liveSource.vm()) return { label: 'Most common level', value: EMPTY_VALUE, caption: null };
        const orderZeroBased = this.modeActiveLevelOrder();
        if (orderZeroBased === null) return { label: 'Most common level', value: EMPTY_VALUE, caption: null };

        const displayOrder = orderZeroBased + 1;
        const total = this.levelCount();
        const title = this.levelTitleByOrder(orderZeroBased);
        if (title === null) {
            const value = total === null ? String(displayOrder) : `${displayOrder}/${total}`;
            return { label: 'Most common level', value, caption: null };
        }
        const caption = total === null ? `Level ${displayOrder}` : `Level ${displayOrder}/${total}`;
        return { label: 'Most common level', value: title, caption };
    }

    /**
     * Returns the 0-based level order that appears most frequently among active
     * runs. When two or more orders share the top frequency, the lowest order is
     * returned so the result is deterministic. Returns null when there are no
     * active-run orders.
     */
    private modeActiveLevelOrder(): number | null {
        const orders = this.activeRunLevelOrders();
        if (orders.length === 0) return null;

        const frequencyByOrder = new Map<number, number>();
        for (const order of orders) {
            frequencyByOrder.set(order, (frequencyByOrder.get(order) ?? 0) + 1);
        }

        let modeOrder: number | null = null;
        let topFrequency = 0;
        for (const [order, frequency] of frequencyByOrder) {
            if (frequency > topFrequency || (frequency === topFrequency && modeOrder !== null && order < modeOrder)) {
                modeOrder = order;
                topFrequency = frequency;
            }
        }
        return modeOrder;
    }

    /**
     * Mean duration of ended runs, each capped to the instance end before averaging, formatted
     * coarsely (e.g. `1h 42m`), with the min–max range of the capped durations as the caption.
     * When no runs have ended, value is `—` and caption is null.
     */
    private avgDurationTile(): StatTile {
        const liveVm = this.liveSource.vm();
        if (!liveVm) return { label: 'Avg duration', value: EMPTY_VALUE, caption: null };

        const { endedRunTimings } = liveVm;
        if (endedRunTimings.length === 0) return { label: 'Avg duration', value: EMPTY_VALUE, caption: null };

        const instanceEndMs = this.staticVm()?.instance.endTime.getTime() ?? null;
        const runDurationsMs = endedRunTimings.map((timing) =>
            cappedRunDurationMs(timing.startMs, timing.endMs, instanceEndMs),
        );

        const meanMs = Utils.Array.mean(runDurationsMs);
        if (meanMs === null) return { label: 'Avg duration', value: EMPTY_VALUE, caption: null };

        const minMs = Math.min(...runDurationsMs);
        const maxMs = Math.max(...runDurationsMs);
        const minLabel = this.formatDurationCoarse(minMs);
        const maxLabel = this.formatDurationCoarse(maxMs);
        const rangeCaption = minMs === maxMs || minLabel === maxLabel ? null : `${minLabel}–${maxLabel}`;

        return {
            label: 'Avg duration',
            value: this.formatDurationCoarse(meanMs),
            caption: rangeCaption,
        };
    }

    /** Mean combined score across ended runs, with the attainable maximum as caption. */
    private averageScoreTile(): StatTile {
        const liveVm = this.liveSource.vm();
        if (!liveVm) return { label: 'Avg score', value: EMPTY_VALUE, caption: null };
        const mean = Utils.Array.mean(liveVm.endedScores);
        if (mean === null) return { label: 'Avg score', value: EMPTY_VALUE, caption: null };
        const maxScore = this.maxScoreValue();
        return {
            label: 'Avg score',
            value: this.formatNumber(Math.round(mean)),
            caption: maxScore === null ? null : `of ${this.formatNumber(maxScore)}`,
        };
    }

    /**
     * Total hint-taken and solution-displayed events for the instance.
     * Value format: `{hintCount} · {solutionCount}`, caption: `hints · solutions`.
     */
    private hintsSolutionsTile(): StatTile {
        const liveVm = this.liveSource.vm();
        if (!liveVm) return { label: 'Hints & solutions', value: EMPTY_VALUE, caption: null };
        return {
            label: 'Hints & solutions',
            value: `${liveVm.hintCount} · ${liveVm.solutionCount}`,
            caption: 'hints · solutions',
            segments: [
                { text: String(liveVm.hintCount), color: HINT_COLOR },
                { text: ' · ', color: null },
                { text: String(liveVm.solutionCount), color: PALETTE.deepOrange.color },
            ],
        };
    }

    /** Training run IDs that are started but not ended. */
    private activeRunIds(): ReadonlySet<number> {
        return this.liveSource.vm()?.activeRunIds ?? new Set<number>();
    }

    /** Current (0-based) level order of each active run. */
    private activeRunLevelOrders(): number[] {
        const liveVm = this.liveSource.vm();
        if (!liveVm) return [];
        const activeIds = this.activeRunIds();
        const orders: number[] = [];
        for (const [runId, maxLevelOrder] of liveVm.maxLevelOrderByRunId) {
            if (activeIds.has(runId)) orders.push(maxLevelOrder);
        }
        return orders;
    }

    /**
     * Total number of levels in the training definition, or null while the
     * static view-model has not yet resolved.
     */
    private levelCount(): number | null {
        const staticVm = this.staticVm();
        return staticVm ? staticVm.levelCount : null;
    }

    /**
     * Sum of maximum attainable scores across all definition levels, or null
     * while the static view-model has not yet resolved.
     */
    private maxScoreValue(): number | null {
        const staticVm = this.staticVm();
        return staticVm ? staticVm.maxScore : null;
    }

    /**
     * Resolves the title of the level at the given 0-based order from the
     * training definition, or null while the static view-model has not resolved.
     *
     * @param orderZeroBased  The 0-based level order to resolve.
     */
    private levelTitleByOrder(orderZeroBased: number): string | null {
        return this.staticVm()?.levelTitleByOrder.get(orderZeroBased) ?? null;
    }

    /**
     * Formats a duration in milliseconds into the two largest non-zero units
     * (e.g. `1h 42m`, `2d`, `45m`).
     *
     * @param durationMs  Duration in milliseconds to format.
     */
    private formatDurationCoarse(durationMs: number): string {
        const duration = intervalToDuration({ start: 0, end: Math.max(0, Math.round(durationMs)) });
        const formatted = formatDuration(duration, {
            format: ['years', 'months', 'days', 'hours', 'minutes'],
            delimiter: ' ',
        });
        if (!formatted) return '0m';

        const parts = formatted.split(' ');
        const abbreviated: string[] = [];
        let index = 0;
        while (index < parts.length && abbreviated.length < 2) {
            const numericPart = parts[index];
            const unitPart = parts[index + 1];
            if (numericPart !== undefined && unitPart !== undefined) {
                const num = parseInt(numericPart, 10);
                const unit = unitPart.replace(/s$/, '').charAt(0);
                abbreviated.push(`${num}${unit}`);
            }
            index += 2;
        }
        return abbreviated.join(' ');
    }

    /** Formats an integer with locale grouping separators. */
    private formatNumber(value: number): string {
        return new Intl.NumberFormat().format(value);
    }

    /**
     * Reports error if the live source errored; loading only until either source
     * has produced data, so tiles fill in as each source resolves.
     */
    private computeCardStatus(): ChartSourceStatus {
        if (this.liveSource.status() === 'error') return 'error';
        const anyDataResolved = this.staticVm() !== null || this.liveSource.vm() !== null;
        return anyDataResolved ? 'ready' : 'loading';
    }
}
