import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChartRowComponent, ChartRowItemDirective } from '../../dashboard-layout';
import { TraineeOverviewComponent } from '../../charts/trainee-overview/trainee-overview.component';
import { CumulativeScoreChartComponent } from '../../charts/cumulative-score/cumulative-score-chart.component';
import { TimeVsScoreChartComponent } from '../../charts/time-vs-score/time-vs-score-chart.component';
import { TraineeWrongAnswersChartComponent } from '../../charts/top-wrong-answers/trainee-wrong-answers-chart.component';
import { EventTimelineChartComponent } from '../../charts/event-timeline/event-timeline-chart.component';
import { CommandsLogTableComponent } from '../../charts/commands-log/commands-log-table.component';
import { InstanceId } from '../../charts/progress';

/**
 * Individual dashboard view: per-trainee analysis for a single selected run, covering
 * cumulative score, time-versus-score, wrong answers, an event timeline, and a command log.
 */
@Component({
    selector: 'crczp-individual-view',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ChartRowComponent,
        ChartRowItemDirective,
        TraineeOverviewComponent,
        CumulativeScoreChartComponent,
        TimeVsScoreChartComponent,
        TraineeWrongAnswersChartComponent,
        EventTimelineChartComponent,
        CommandsLogTableComponent,
    ],
    templateUrl: './individual-view.component.html',
    styleUrl: './individual-view.component.scss',
})
export class IndividualViewComponent {
    /** Identifies the instance whose trainee runs are analyzed. */
    readonly instanceId = input.required<InstanceId>();
    /** Run id of the trainee currently selected, or null when none is selected. */
    readonly selectedRunId = input.required<number | null>();
    /** Emits the run id chosen in the trainee overview, or null when cleared. */
    readonly selectedRunIdChange = output<number | null>();
}
