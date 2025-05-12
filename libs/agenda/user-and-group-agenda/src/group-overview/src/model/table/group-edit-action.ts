import { EditAction } from '@sentinel/components/table';
import { Observable } from 'rxjs';

export class GroupEditAction extends EditAction {
    constructor(disabled$: Observable<boolean>, result$: Observable<any>) {
        super('Edit group-overview', disabled$, result$);
    }
}
