import { SentinelControlItem } from '@sentinel/components/controls';
import { defer, of } from 'rxjs';

/**
 * @dynamic
 */
export class PhaseDetailExpandControls {
    static readonly EXPAND_ACTION_ID = 'expand';
    static readonly COLLAPSE_ACTION_ID = 'collapse';

    static readonly EXPAND_LABEL = 'Expand All';
    static readonly COLLAPSE_LABEL = 'Collapse All';

    static create(): SentinelControlItem[] {
        return [
            new SentinelControlItem(
                this.EXPAND_ACTION_ID,
                this.EXPAND_LABEL,
                'primary',
                of(false),
                defer(() => of(this.EXPAND_ACTION_ID)),
            ),
            new SentinelControlItem(
                this.EXPAND_ACTION_ID,
                this.COLLAPSE_LABEL,
                'primary',
                of(false),
                defer(() => of(this.COLLAPSE_ACTION_ID)),
            ),
        ];
    }
}
