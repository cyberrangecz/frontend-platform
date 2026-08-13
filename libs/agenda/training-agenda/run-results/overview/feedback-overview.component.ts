import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { intervalToDuration } from 'date-fns';
import { EntityResolverService } from '@crczp/event-query-engine';
import { OverflowTooltipDirective } from '@crczp/utils';
import { createTraineeOverviewSource, PALETTE, resolveInstanceLevels, TraineeRawRow } from '@crczp/components';

/** Amber used for hint indicators; darker than the palette yellow for legibility on light surfaces. */
const HINT_COLOR = '#a98700';

/** A single labelled statistic in the feedback card's summary strip. */
interface FeedbackStat {
    /** Stat label shown above the value. */
    readonly label: string;
    /** Rendered stat value. */
    readonly value: string;
    /** Inline value colour, or null to inherit the default text colour. */
    readonly color: string | null;
}

/** Fully derived view-model for the selected trainee's feedback card. */
interface FeedbackCardView {
    /** Trainee display name. */
    readonly name: string;
    /** Login and email joined for the contact line, or a single available part. */
    readonly contact: string;
    /** Data-URL avatar, or null when the trainee has no picture. */
    readonly avatarSrc: string | null;
    /** Uppercase leading name character, shown when no picture is available. */
    readonly avatarInitial: string;
    /** Trainee-centric summary stats, in display order. */
    readonly stats: readonly FeedbackStat[];
}

/** Display status the card switches its chrome on. */
type CardStatus = 'loading' | 'empty' | 'error' | 'ready';

/**
 * Trainee feedback identity card: a header carrying the trainee's identity above a run-wide
 * summary stat strip. All figures are derived for the single run identified by {@link runId}
 * from the instance-wide trainee-overview source; the percentile compares the run against the
 * finished runs of the instance.
 */
@Component({
    selector: 'crczp-feedback-overview',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OverflowTooltipDirective],
    templateUrl: './feedback-overview.component.html',
    styleUrl: './feedback-overview.component.scss',
})
export class FeedbackOverviewComponent {
    /** Instance whose runs supply the trainee figures and the percentile population. */
    readonly instanceId = input.required<number>();
    /** Run the card gives feedback on. */
    readonly runId = input.required<number>();

    private readonly entityResolver = inject(EntityResolverService);

    /** Live per-run rows for the whole instance, or null before the first data lands. */
    private readonly source = createTraineeOverviewSource(this.instanceId, this.entityResolver);

    /** Resolved instance level axis, supplying the total level count; null until resolved. */
    private readonly resolvedLevels = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /** The single run this card describes, or null when absent from the instance rows. */
    private readonly selectedRun = computed<TraineeRawRow | null>(
        () => this.source.vm()?.find((row) => row.runId === this.runId()) ?? null,
    );

    /** Fully derived card view-model, or null until the run and level axis are both available. */
    protected readonly view = computed<FeedbackCardView | null>(() => {
        const run = this.selectedRun();
        const rows = this.source.vm();
        const levels = this.resolvedLevels();
        if (!run || !rows || !levels) return null;
        return this.toView(run, rows, levels.levels.length);
    });

    /** Status the card chrome reflects, downgraded to loading until the level axis resolves. */
    protected readonly status = computed<CardStatus>(() => {
        const sourceStatus = this.source.status();
        if (sourceStatus === 'error') return 'error';
        if (sourceStatus === 'idle' || sourceStatus === 'loading') return 'loading';
        if (!this.resolvedLevels()) return 'loading';
        if (sourceStatus === 'empty') return 'empty';
        return this.view() ? 'ready' : 'empty';
    });

    /**
     * Builds the card view-model for one run against the instance population.
     *
     * @param run         The run this card describes.
     * @param rows        All runs in the instance, the percentile population source.
     * @param levelsTotal Total number of levels on the instance.
     */
    private toView(run: TraineeRawRow, rows: readonly TraineeRawRow[], levelsTotal: number): FeedbackCardView {
        const score = run.trainingScore + run.assessmentScore;
        const levelsSolved = run.levels.filter((level) => level.completedTimestamp !== null).length;
        const hints = run.levels.reduce((sum, level) => sum + level.hintCount, 0);
        const solutions = run.levels.reduce((sum, level) => sum + level.solutionCount, 0);
        const wrong = run.levels.reduce((sum, level) => sum + level.wrongCount, 0);

        const contact = [run.traineeLogin, run.traineeEmail].filter((part) => part.length > 0).join(' · ');
        const picture = run.traineePicture.trim();

        return {
            name: run.traineeName,
            contact,
            avatarSrc: picture.length > 0 ? `data:image/png;base64,${picture}` : null,
            avatarInitial: run.traineeName.trim().charAt(0).toUpperCase() || '?',
            stats: [
                { label: 'Score', value: String(score), color: null },
                { label: 'Percentile', value: String(this.percentile(score, rows)), color: null },
                { label: 'Levels solved', value: levelsTotal > 0 ? `${levelsSolved}/${levelsTotal}` : String(levelsSolved), color: null },
                { label: 'Elapsed', value: this.elapsedText(run), color: null },
                { label: 'Wrong', value: String(wrong), color: PALETTE.red.color },
                { label: 'Hints', value: String(hints), color: HINT_COLOR },
                { label: 'Solutions', value: String(solutions), color: PALETTE.deepOrange.color },
            ],
        };
    }

    /**
     * Inclusive percentile rank of a score among the finished runs of the instance: the
     * share of finished runs scoring at or below it, as a whole number. Zero when no run
     * has finished.
     *
     * @param score The run's combined score.
     * @param rows  All runs in the instance.
     */
    private percentile(score: number, rows: readonly TraineeRawRow[]): number {
        const finishedScores = rows
            .filter((row) => row.hasEndedRow)
            .map((row) => row.trainingScore + row.assessmentScore);
        if (finishedScores.length === 0) return 0;
        const atOrBelow = finishedScores.filter((finishedScore) => finishedScore <= score).length;
        return Math.round((atOrBelow / finishedScores.length) * 100);
    }

    /**
     * Elapsed wall-clock time of a finished run rendered as an abbreviated hours-and-minutes
     * string (e.g. "1h 47m", "8m", "<1m"); a dash when the run carries no completed interval.
     *
     * @param run The run whose elapsed time to format.
     */
    private elapsedText(run: TraineeRawRow): string {
        if (run.endEndTime === null || run.endStartTime === null) return '—';
        const safeMs = Math.max(0, Math.round(run.endEndTime - run.endStartTime));
        const duration = intervalToDuration({ start: 0, end: safeMs });
        const hours = (duration.days ?? 0) * 24 + (duration.hours ?? 0);
        const minutes = duration.minutes ?? 0;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;
        return '<1m';
    }
}
