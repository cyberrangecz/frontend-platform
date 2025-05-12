import { SentinelControlItem } from '@sentinel/components/controls';
import { defer, of } from 'rxjs';
import { AdaptiveDefinitionService } from '../services/state/adaptive-definition.service';

/**
 * @dynamic
 */
export class TrainingDefinitionOverviewControls {
    static readonly MITRE_ACTION_ID = 'mitre';
    static readonly SIMULATOR_ACTION_ID = 'simulator';
    static readonly CREATE_ACTION_ID = 'create';
    static readonly UPLOAD_ACTION_ID = 'upload';

    static createTopControls(service: AdaptiveDefinitionService): SentinelControlItem[] {
        return [
            new SentinelControlItem(
                this.CREATE_ACTION_ID,
                'Create',
                'primary',
                of(false),
                defer(() => service.create()),
            ),
            new SentinelControlItem(
                this.UPLOAD_ACTION_ID,
                'Upload',
                'primary',
                of(false),
                defer(() => service.upload()),
            ),
        ];
    }

    static createBottomControls(service: AdaptiveDefinitionService): SentinelControlItem[] {
        return [
            new SentinelControlItem(
                this.SIMULATOR_ACTION_ID,
                'Instance Simulating Tool',
                'primary',
                of(false),
                defer(() => service.toSimulator()),
            ),
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
