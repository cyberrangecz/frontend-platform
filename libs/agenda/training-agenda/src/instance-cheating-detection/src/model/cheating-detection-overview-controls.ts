import { SentinelControlItem } from '@sentinel/components/controls';
import { defer, of } from 'rxjs';
import { CheatingDetectionService } from '../services/cheating-detection.service';

/**
 * @dynamic
 */
export class CheatingDetectionOverviewControls {
    static readonly CREATE_ACTION_ID = 'create';

    static createTopControls(service: CheatingDetectionService, trainingInstanceId: number): SentinelControlItem[] {
        return [
            new SentinelControlItem(
                this.CREATE_ACTION_ID,
                'Create Cheating Detection',
                'primary',
                of(false),
                defer(() => service.toCreatePage(trainingInstanceId)),
            ),
        ];
    }
}
