import { EventEmitter } from '@angular/core';
import { SentinelControlItem } from '@sentinel/components/controls';
import { defer, Observable, of } from 'rxjs';

/**
 * @dynamic
 */
export class AdaptiveInstanceInfoControls {
    static readonly RESULTS_ACTION_ID = 'results';

    static create(showResultsEmitter: EventEmitter<boolean>, disabled$: Observable<boolean>): SentinelControlItem[] {
        return [
            new SentinelControlItem(
                this.RESULTS_ACTION_ID,
                'Show Progress',
                'primary',
                disabled$,
                defer(() => of(showResultsEmitter.emit(true))),
            ),
        ];
    }
}
