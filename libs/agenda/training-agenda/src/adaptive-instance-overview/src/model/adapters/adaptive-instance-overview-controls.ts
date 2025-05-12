import { SentinelControlItem } from '@sentinel/components/controls';
import { defer, of } from 'rxjs';
import { AdaptiveInstanceOverviewService } from '../../services/state/adaptive-instance-overview.service';

/**
 * @dynamic
 */
export class AdaptiveInstanceOverviewControls {
    static CREATE_ACTION_ID = 'add';

    static create(service: AdaptiveInstanceOverviewService): SentinelControlItem[] {
        return [
            new SentinelControlItem(
                this.CREATE_ACTION_ID,
                'Create',
                'primary',
                of(false),
                defer(() => service.create()),
            ),
        ];
    }
}
