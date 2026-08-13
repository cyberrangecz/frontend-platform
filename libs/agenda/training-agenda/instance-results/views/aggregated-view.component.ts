import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
    ChartRowComponent,
    ChartRowItemDirective,
    CommandsChartComponent,
    DashboardSectionComponent,
    DataOverviewCardComponent,
    InstanceId,
    LevelDifficultyComponent,
    LiveEventFeedComponent,
    PlayersPerLevelChartComponent,
    ProgressVisualizationComponent,
    ScoreAttainmentChartComponent,
    ScoreboardTableComponent,
    TimeVsExpectedChartComponent,
    TopWrongAnswersChartComponent,
} from '@crczp/components';

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
