import { EventEmitter } from '@angular/core';
import { SentinelControlItem } from '@sentinel/components/controls';
import { defer, EMPTY, Observable } from 'rxjs';

/**
 * @dynamic
 */
export class TrainingInstanceInfoControls {
    static readonly PROGRESS_ACTION_ID = 'progress';
    static readonly RESULTS_ACTION_ID = 'results';
    static readonly RESULTS_AGGREGATED_ID = 'stacked_bar_chart';
    static readonly CHEATING_DETECTION_ID = 'cheating_detection';
    static readonly EXPORT_SCORE_ID = 'export_score';

    static create(
        showProgressEmitter: EventEmitter<boolean>,
        showResultsEmitter: EventEmitter<boolean>,
        showAggregatedResults: EventEmitter<boolean>,
        showCheatingDetection: EventEmitter<boolean>,
        exportScore: EventEmitter<boolean>,
        disabled$: Observable<boolean>,
    ): SentinelControlItem[] {
        return [
            new SentinelControlItem(
                this.PROGRESS_ACTION_ID,
                'Show Progress',
                'primary',
                disabled$,
                defer(() => {
                    showProgressEmitter.emit(true);
                    return EMPTY;
                }),
            ),
            new SentinelControlItem(
                this.RESULTS_ACTION_ID,
                'Show Results',
                'primary',
                disabled$,
                defer(() => {
                    showResultsEmitter.emit(false);
                    return EMPTY;
                }),
            ),
            new SentinelControlItem(
                this.CHEATING_DETECTION_ID,
                'Cheating Detection',
                'primary',
                disabled$,
                defer(() => {
                    showCheatingDetection.emit(false);
                    return EMPTY;
                }),
            ),
            new SentinelControlItem(
                this.EXPORT_SCORE_ID,
                'Export Score',
                'primary',
                disabled$,
                defer(() => {
                    exportScore.emit(false);
                    return EMPTY;
                }),
            ),
        ];
    }
}
