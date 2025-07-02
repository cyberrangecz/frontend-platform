import {Observable} from 'rxjs';
import {SentinelControlItem} from "@sentinel/components/controls";

export class SaveControlItem extends SentinelControlItem {
    static readonly ID = 'save';

    constructor(
        public label: string,
        disabled$: Observable<boolean>,
        result$: Observable<any>,
    ) {
        super(SaveControlItem.ID, label, 'primary', disabled$, result$);
    }
}
