import {DeleteAction} from '@sentinel/components/table';
import {Observable} from 'rxjs';

export class GroupDeleteAction extends DeleteAction {
    constructor(disabled$: Observable<boolean>, result$: Observable<any>) {
        super('Delete group-overview', disabled$, result$);
    }
}
