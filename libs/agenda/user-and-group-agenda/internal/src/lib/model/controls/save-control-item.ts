import {SentinelControlItemSignal} from '@sentinel/components/controls';
import {Observable} from 'rxjs';

export class SaveControlItem extends SentinelControlItemSignal {
    static readonly ID = 'save';

    constructor(
        public label: string,
        disabled$: Observable<boolean>,
        result$: Observable<any>,
    ) {
        super(SaveControlItem.ID, label, 'primary', disabled$, result$);
    }
}
