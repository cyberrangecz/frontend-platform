import { PlatformEventType } from '@crczp/visualization-model';

export function validatePoolId(eventType: PlatformEventType, poolId: number | undefined): void {
    if (eventType === PlatformEventType.COMMAND && poolId === undefined) {
        throw new Error(`poolId required for pool-scoped event type: ${eventType}`);
    }
}
