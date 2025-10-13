import { SentinelControlItem } from '@sentinel/components/controls';
import { combineLatest, defer, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonTrainingInstanceEditService } from '../../services/state/edit/common-training-instance-edit.service';

/**
 * @dynamic
 */
export class TrainingInstanceEditControls {
    static readonly SAVE_ACTION_ID = 'save';

    static create(
        service: CommonTrainingInstanceEditService,
        saveDisabled$: Observable<boolean>,
        instanceValid$: Observable<boolean>
    ): SentinelControlItem[] {
        return TrainingInstanceEditControls.createControls(
            service,
            saveDisabled$,
            instanceValid$
        );
    }

    private static createControls(
        service: CommonTrainingInstanceEditService,
        saveDisabled$: Observable<boolean>,
        instanceValid$: Observable<boolean>
    ): SentinelControlItem[] {
        const disabled$: Observable<boolean> = combineLatest([
            saveDisabled$,
            instanceValid$,
        ]).pipe(map(([save, valid]) => save || !valid));
        return [
            new SentinelControlItem(
                this.SAVE_ACTION_ID,
                'Save',
                'primary',
                disabled$,
                defer(() => service.save())
            ),
        ];
    }
}
