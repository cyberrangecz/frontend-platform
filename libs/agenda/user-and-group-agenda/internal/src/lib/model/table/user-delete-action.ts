import { DeleteAction } from '@sentinel/components/table';
import { Observable } from 'rxjs';

export class UserDeleteAction extends DeleteAction {
    constructor(disabled$: Observable<boolean>, result$: Observable<any>) {
        super('Delete user', disabled$, result$);
    }
}
