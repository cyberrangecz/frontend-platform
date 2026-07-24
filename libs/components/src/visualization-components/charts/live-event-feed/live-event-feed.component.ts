import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal,
    Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { format, formatDistanceStrict } from 'date-fns';
import { interval, map, startWith } from 'rxjs';
import { EntityResolverService } from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';
import {
    ChartPanelInputs,
    ChartPanelShellComponent,
    ChartSourceStatus,
    DASHBOARD_CONFIG,
    eventTypeColor,
    resolveInstanceLevels,
    RichTooltipDirective,
    RichTooltipModel,
    RichTooltipRow,
    TraineeIdentityComponent,
} from '../shared';
import { createLiveEventFeedSource, EnrichedFeedRow, FeedEventRow } from './live-event-feed-source';

/** Human-readable labels for each configured event type. */
const EVENT_TYPE_LABELS: Record<PlatformEventType, string> = {
    [PlatformEventType.LEVEL_STARTED]: 'Level started',
    [PlatformEventType.LEVEL_COMPLETED]: 'Level completed',
    [PlatformEventType.CORRECT_ANSWER_SUBMITTED]: 'Correct answer',
    [PlatformEventType.WRONG_ANSWER_SUBMITTED]: 'Wrong answer',
    [PlatformEventType.HINT_TAKEN]: 'Hint taken',
    [PlatformEventType.SOLUTION_DISPLAYED]: 'Solution shown',
    [PlatformEventType.TRAINING_RUN_STARTED]: 'Run started',
    [PlatformEventType.TRAINING_RUN_RESUMED]: 'Run resumed',
    [PlatformEventType.TRAINING_RUN_ENDED]: 'Run finished',
    [PlatformEventType.ASSESSMENT_ANSWERS]: 'Assessment submitted',
    [PlatformEventType.COMMAND]: 'Command',
};

/** Flat, render-ready projection of one event row consumed directly by the template. */
interface DisplayRow {
    /** Stable event id, used as the `@for` track key. */
    readonly id: string;
    /** Relative age label derived from the shared clock, e.g. "2 minutes ago". */
    readonly relativeTime: string;
    /** Resolved trainee display name. */
    readonly traineeName: string;
    /** Raw base64 avatar picture of the trainee; empty string when none. */
    readonly traineePicture: string;
    /** Human-readable event-type label. */
    readonly eventLabel: string;
    /** Theme colour for the event-type indicator dot. */
    readonly dotColor: string;
    /** Level label for level-scoped events; empty for run-lifecycle events. */
    readonly level: string;
    /** Structured hover tooltip: trainee name as title, absolute time and type-specific detail as rows. */
    readonly tooltip: RichTooltipModel;
}

/**
 * Builds the structured tooltip for an event. The trainee name is the root title; the
 * rows carry only information not already visible in the feed row — the absolute time
 * (a more precise form of the row's relative age) and any type-specific detail.
 *
 * @param row           A raw feed row of any configured type.
 * @param traineeName   Resolved trainee display name, used as the tooltip title.
 * @param absoluteTime  Absolute timestamp string.
 */
function buildTooltip(row: FeedEventRow, traineeName: string, absoluteTime: string): RichTooltipModel {
    const rows: RichTooltipRow[] = [{ label: 'Time', value: absoluteTime }];
    switch (row.type) {
        case PlatformEventType.CORRECT_ANSWER_SUBMITTED:
            rows.push({ label: 'Answer', value: row.answer_content, valueColor: eventTypeColor(row.type) });
            break;
        case PlatformEventType.WRONG_ANSWER_SUBMITTED:
            rows.push(
                { label: 'Attempt', value: `#${row.count}` },
                { label: 'Answer', value: row.answer_content, valueColor: eventTypeColor(row.type) },
            );
            break;
        case PlatformEventType.HINT_TAKEN:
            rows.push({ label: 'Hint', value: row.hint_title }, { label: 'Penalty', value: `−${row.hint_penalty_points} pts` });
            break;
        case PlatformEventType.SOLUTION_DISPLAYED:
            rows.push({ label: 'Penalty', value: `−${row.penalty_points} pts` });
            break;
        default:
            break;
    }
    return { title: traineeName, rows };
}

/**
 * Returns the level label for a row. LEVEL_STARTED rows carry an authoritative
 * `level_title`; other level-scoped events resolve their `level_order` to a title.
 * Run-lifecycle events return an empty string.
 *
 * @param row           A raw feed row.
 * @param levelByOrder  Map from 0-based level_order to the resolved title.
 */
function buildLevelLabel(row: FeedEventRow, levelByOrder: ReadonlyMap<number, string>): string {
    switch (row.type) {
        case PlatformEventType.TRAINING_RUN_STARTED:
        case PlatformEventType.TRAINING_RUN_RESUMED:
        case PlatformEventType.TRAINING_RUN_ENDED:
            return '';
        case PlatformEventType.LEVEL_STARTED:
            return row.level_title;
        default:
            return levelByOrder.get(row.level_order) ?? '';
    }
}

/**
 * Live, reverse-chronological event feed panel.
 *
 * Displays the 100 most recent audit events across all runs on one instance,
 * newest first, colour-coded by type.
 */
@Component({
    selector: 'crczp-live-event-feed',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ChartPanelShellComponent,
        RichTooltipDirective,
        TraineeIdentityComponent,
    ],
    templateUrl: './live-event-feed.component.html',
    styleUrl: './live-event-feed.component.scss',
})
export class LiveEventFeedComponent implements ChartPanelInputs {
    /** Training instance whose most-recent events this panel displays. */
    readonly instanceId: InputSignal<number> = input.required<number>();

    private readonly entityResolver = inject(EntityResolverService);

    private readonly liveSource = createLiveEventFeedSource(this.instanceId, this.entityResolver);

    /** Current timestamp in milliseconds, updated on the dashboard clock cadence; drives the relative-time labels. */
    private readonly now: Signal<number> = toSignal(
        interval(DASHBOARD_CONFIG.clockTickMs).pipe(
            startWith(0),
            map(() => Date.now()),
        ),
        { initialValue: Date.now() },
    );

    /** Map from 0-based level_order to the resolved level title. */
    private readonly levelByOrder: Signal<ReadonlyMap<number, string>> = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver).pipe(
            map((resolved) =>
                resolved === null
                    ? new Map<number, string>()
                    : new Map(resolved.levels.map((level) => [level.order, level.title])),
            ),
        ),
        { initialValue: new Map<number, string>() },
    );

    /**
     * Render-ready rows joining each enriched event row with the level label
     * and clock-derived relative time. Tracked by stable event id in the template.
     */
    protected readonly displayRows = computed<readonly DisplayRow[]>(() => {
        const viewModel = this.liveSource.vm();
        if (viewModel === null) return [];

        const nowDate = new Date(this.now());
        const levels = this.levelByOrder();

        return viewModel.rows.map((row: EnrichedFeedRow): DisplayRow => {
            const eventLabel = EVENT_TYPE_LABELS[row.type];
            const dotColor = eventTypeColor(row.type);
            const level = buildLevelLabel(row, levels);
            const absoluteTime = format(new Date(row.timestamp), 'yyyy-MM-dd HH:mm:ss');
            return {
                id: row.id,
                relativeTime: formatDistanceStrict(new Date(row.timestamp), nowDate, { addSuffix: true }),
                traineeName: row.traineeName,
                traineePicture: row.traineePicture,
                eventLabel,
                dotColor,
                level,
                tooltip: buildTooltip(row, row.traineeName, absoluteTime),
            };
        });
    });

    /** Reflects live source status for the shell. */
    protected readonly status = computed<ChartSourceStatus>(() => this.liveSource.status());

    /** Panel info-tooltip text, reflecting the configured feed window size. */
    protected readonly feedInfo =
        `The ${DASHBOARD_CONFIG.liveFeedMaxRows} most recent events across all runs, newest first. ` +
        `Hover an event for its details.`;
}
