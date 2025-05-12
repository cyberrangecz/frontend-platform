import { SentinelControlItem } from '@sentinel/components/controls';
import { combineLatest, defer, Observable } from 'rxjs';
import { AdaptiveInstanceEditService } from '../../services/state/edit/adaptive-instance-edit.service';
import { map } from 'rxjs/operators';

/**
 * @dynamic
 */
export class AdaptiveInstanceEditControls {
    static readonly SAVE_ACTION_ID = 'save';

    static create(
        service: AdaptiveInstanceEditService,
        saveDisabled$: Observable<boolean>,
        instanceValid$: Observable<boolean>,
    ): SentinelControlItem[] {
        return this.createControls(service, saveDisabled$, instanceValid$);
    }

    private static createControls(
        service: AdaptiveInstanceEditService,
        saveDisabled$: Observable<boolean>,
        instanceValid$: Observable<boolean>,
    ): SentinelControlItem[] {
        const disabled$: Observable<boolean> = combineLatest(saveDisabled$, instanceValid$).pipe(
            map((save) => save[0] || !save[1]),
        );
        return [
            new SentinelControlItem(
                this.SAVE_ACTION_ID,
                'Save',
                'primary',
                disabled$,
                defer(() => service.save()),
            ),
        ];
    }
}
