import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { EntityResolverService, EntityType } from '@crczp/event-query-engine';
import {
    AssistsCoverageComponent,
    ChartRowComponent,
    ChartRowItemDirective,
    CumulativeScoreChartComponent,
    DashboardSectionComponent,
    EventTimelineChartComponent,
    LevelPercentilesComponent,
    OverallSpeedVsScoreComponent,
    providePauseGate,
    ScoreboardTableComponent,
    TimeVsScoreChartComponent,
} from '@crczp/components';
import { FeedbackOverviewComponent } from './overview/feedback-overview.component';

/**
 * Post-run feedback dashboard for a single trainee: their completed run read on its own and
 * against the other trainees. Driven by one training run; the instance the run belongs to is
 * resolved from it and supplied to the reused instance-scoped charts.
 */
@Component({
    selector: 'crczp-trainee-feedback-dashboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DashboardSectionComponent,
        ChartRowComponent,
        ChartRowItemDirective,
        FeedbackOverviewComponent,
        OverallSpeedVsScoreComponent,
        LevelPercentilesComponent,
        AssistsCoverageComponent,
        ScoreboardTableComponent,
        CumulativeScoreChartComponent,
        TimeVsScoreChartComponent,
        EventTimelineChartComponent,
    ],
    providers: [...providePauseGate()],
    templateUrl: './trainee-feedback-dashboard.component.html',
    styleUrl: './trainee-feedback-dashboard.component.scss',
})
export class TraineeFeedbackDashboardComponent {
    private readonly entityResolver = inject(EntityResolverService);

    /** Identifies the completed training run this dashboard gives feedback on. */
    readonly runId = input.required<number, string | number>({
        transform: (value) => Number(value),
    });

    /** The resolved run, or null until resolution completes. */
    private readonly run = toSignal(
        toObservable(this.runId).pipe(
            switchMap((runId) =>
                this.entityResolver
                    .resolveMap(EntityType.TrainingRun, [runId])
                    .pipe(map((runs) => runs.get(runId) ?? null)),
            ),
        ),
        { initialValue: null },
    );

    /** Instance the run belongs to, resolved from the run id; null until resolution completes. */
    protected readonly resolvedInstanceId = computed<number | null>(
        () => this.run()?.trainingInstanceId ?? null,
    );
}
