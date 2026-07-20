import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsDirective } from 'ngx-echarts';

import { ChartPanelShellComponent, ECHARTS_CORE_PROVIDER, isRunSelected, QuerySource } from '../shared';
import { SegmentedToggleComponent } from '../../../segmented-toggle/segmented-toggle.component';
import { createTopWrongAnswersSource, WrongAnswerRow } from './top-wrong-answers-source';
import { WrongAnswersChartBase } from './wrong-answers-chart-base.directive';

/**
 * Single-trainee wrong-answer analysis: the per-level ranked incorrect answers of the
 * selected run only. Shown in the dashboard's individual (trainee) view. Before a run is
 * selected (`runId` null or non-positive) the chart shows no submissions rather than
 * falling back to every run.
 */
@Component({
    selector: 'crczp-trainee-wrong-answers-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SegmentedToggleComponent, NgxEchartsDirective, ChartPanelShellComponent, MatIconModule],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './wrong-answers-chart.component.html',
    styleUrl: './wrong-answers-chart.component.scss',
})
export class TraineeWrongAnswersChartComponent extends WrongAnswersChartBase {
    /** Selected training run; null when no trainee is selected. */
    readonly runId: InputSignal<number | null> = input<number | null>(null);

    /** Wrong-answer rows scoped to the selected run. */
    protected readonly source: QuerySource<readonly WrongAnswerRow[]> =
        createTopWrongAnswersSource(this.instanceId, this.runId);

    protected readonly heading = 'Wrong answers';

    protected override readonly cleanMessage = 'No wrong answers from this trainee';

    protected readonly info =
        'This trainee’s incorrect answers per level. Use the toggle to switch between the level-share pie and the ranked bar list; use the bottom timeline to pick a level. In the bar view, 8 answers show at a time — scroll for more. [TIP: scroll over the level picker]';

    /**
     * A selected trainee scopes the data, so zero wrong answers reads as a clean result.
     *
     * @returns True once a trainee run is selected.
     */
    protected override hasSelectedScope(): boolean {
        return isRunSelected(this.runId());
    }

    /** @returns File name (without extension) for the downloaded CSV. */
    csvFilename(): string {
        return 'trainee-wrong-answers';
    }
}
