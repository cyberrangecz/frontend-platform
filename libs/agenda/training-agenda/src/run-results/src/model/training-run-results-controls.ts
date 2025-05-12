import { SentinelControlItem } from '@sentinel/components/controls';
import { defer, of } from 'rxjs';
import { MitreTechniquesOverviewService } from '../service/mitre-techniques.service';

/**
 * @dynamic
 */
export class TrainingRunResultsControls {
    static readonly MITRE_ACTION_ID = 'mitre';

    static createControls(service: MitreTechniquesOverviewService): SentinelControlItem[] {
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
