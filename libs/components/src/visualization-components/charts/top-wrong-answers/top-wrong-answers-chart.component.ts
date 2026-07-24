import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgxEchartsDirective } from 'ngx-echarts';

import { ChartPanelShellComponent, ECHARTS_CORE_PROVIDER, QuerySource } from '../shared';
import { SegmentedToggleComponent } from '../../../segmented-toggle/segmented-toggle.component';
import { createTopWrongAnswersSource, WrongAnswerRow } from './top-wrong-answers-source';
import { WrongAnswersChartBase } from './wrong-answers-chart-base.directive';

/**
 * Aggregated wrong-answer analysis across every run on the instance: per-level ranked
 * incorrect answers as a level-share pie or a ranked bar list. Shown in the dashboard's
 * aggregated view.
 */
@Component({
    selector: 'crczp-top-wrong-answers-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SegmentedToggleComponent, NgxEchartsDirective, ChartPanelShellComponent, MatIconModule],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './wrong-answers-chart.component.html',
    styleUrl: './wrong-answers-chart.component.scss',
})
export class TopWrongAnswersChartComponent extends WrongAnswersChartBase {
    /** Instance-wide wrong-answer rows: every run on the instance. */
    protected readonly source: QuerySource<readonly WrongAnswerRow[]> =
        createTopWrongAnswersSource(this.instanceId);

    protected readonly heading = 'Top wrong answers';

    protected readonly info =
        'Incorrect answers per level. Use the toggle to switch between the level-share pie and the ranked bar list; use the bottom timeline to pick a level. In the bar view, 8 answers show at a time — scroll for more. [TIP: scroll over the level picker]';

    /** @returns File name (without extension) for the downloaded CSV. */
    csvFilename(): string {
        return 'top-wrong-answers';
    }
}
