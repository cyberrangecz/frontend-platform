import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DataOverviewCardComponent } from '../../charts/data-overview/data-overview-card.component';
import { ChartRowComponent, ChartRowItemDirective, DashboardSectionComponent } from '../../dashboard-layout';
import { PlayersPerLevelChartComponent } from '../../charts/players-per-level/players-per-level-chart.component';
import { ScoreboardTableComponent } from '../../charts/scoreboard/scoreboard-table.component';
import { LiveEventFeedComponent } from '../../charts/live-event-feed/live-event-feed.component';
import { ScoreAttainmentChartComponent } from '../../charts/score-attainment/score-attainment-chart.component';
import { TopWrongAnswersChartComponent } from '../../charts/top-wrong-answers/top-wrong-answers-chart.component';
import { TimeVsExpectedChartComponent } from '../../charts/time-vs-expected/time-vs-expected-chart.component';
import { LevelDifficultyComponent } from '../../charts/level-difficulty/level-difficulty.component';
import { CommandsChartComponent } from '../../charts/commands/commands-chart.component';
import { InstanceId, ProgressVisualizationComponent } from '../../charts/progress';

/**
 * Aggregated dashboard view: instance-wide KPIs, live status, standings, level analysis,
 * and command activity across all trainees of a single instance.
 */
@Component({
    selector: 'crczp-aggregated-view',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        DataOverviewCardComponent,
        ChartRowComponent,
        ChartRowItemDirective,
        DashboardSectionComponent,
        ProgressVisualizationComponent,
        LiveEventFeedComponent,
        ScoreboardTableComponent,
        PlayersPerLevelChartComponent,
        ScoreAttainmentChartComponent,
        TopWrongAnswersChartComponent,
        TimeVsExpectedChartComponent,
        LevelDifficultyComponent,
        CommandsChartComponent,
    ],
    templateUrl: './aggregated-view.component.html',
    styleUrl: './aggregated-view.component.scss',
})
export class AggregatedViewComponent {
    /** Identifies the instance whose aggregated data is shown. */
    readonly instanceId = input.required<InstanceId>();
}
