import {defer, of} from 'rxjs';
import {SandboxDefinitionOverviewService} from '@crczp/sandbox-agenda/internal';
import {SentinelControlItem} from "@sentinel/components/controls";

/**
 * @dynamic
 */
export class SandboxDefinitionOverviewControls {
    static readonly CREATE_ACTION_ID = 'create';

    /**
     *
     * @param service
     */
    static create(service: SandboxDefinitionOverviewService): SentinelControlItem[] {
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
