import { SentinelControlItem } from '@sentinel/components/controls';
import { defer, of } from 'rxjs';
import { TrainingInstanceOverviewService } from '../../services/state/training-instance-overview.service';

/**
 * @dynamic
 */
export class TrainingInstanceOverviewControls {
    static CREATE_ACTION_ID = 'add';

    static create(service: TrainingInstanceOverviewService): SentinelControlItem[] {
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
