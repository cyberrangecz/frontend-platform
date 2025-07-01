import {defer, of} from 'rxjs';
import {AccessedTrainingRunService} from '../services/state/training/accessed-training-run.service';
import {SentinelControlItem} from "@sentinel/components/controls";

/**
 * @dynamic
 */
export class AccessedTrainingRunControls {
    static readonly MITRE_ACTION_ID = 'mitre';

    static create(service: AccessedTrainingRunService): SentinelControlItem[] {
        return [
            new SentinelControlItem(
                this.MITRE_ACTION_ID,
                'MITRE ATT&CK Techniques',
                'primary',
                of(false),
                defer(() => service.showMitreTechniques()),
            ),
        ];
    }
}
