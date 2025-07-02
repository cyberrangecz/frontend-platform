import {Observable} from 'rxjs';
import {SentinelControlItem} from "@sentinel/components/controls";

export class RegisterControlItem extends SentinelControlItem {
    static readonly ID = 'register  ';

    constructor(label: string, disabled$: Observable<boolean>, result$: Observable<any>) {
        super(RegisterControlItem.ID, label, 'primary', disabled$, result$);
    }
}
