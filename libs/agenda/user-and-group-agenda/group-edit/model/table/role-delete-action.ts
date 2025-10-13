import {DeleteAction} from '@sentinel/components/table';
import {Observable} from 'rxjs';

export class RoleDeleteAction extends DeleteAction {
    constructor(disabled$: Observable<boolean>, result$: Observable<any>) {
        super('Delete role', disabled$, result$);
    }
}
