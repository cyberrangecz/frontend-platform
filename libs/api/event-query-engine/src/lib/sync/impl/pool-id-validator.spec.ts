import { PlatformEventType } from '@crczp/visualization-model';
import { validatePoolId } from './pool-id-validator';

describe('validatePoolId', () => {
    it('throws for COMMAND with undefined poolId, referencing the offending event type', () => {
        expect(() => validatePoolId(PlatformEventType.COMMAND, undefined)).toThrow(
            PlatformEventType.COMMAND,
        );
    });

    it('does not throw for COMMAND with valid poolId', () => {
        expect(() => validatePoolId(PlatformEventType.COMMAND, 42)).not.toThrow();
    });

    it('does not throw for non-COMMAND type without poolId', () => {
        expect(() => validatePoolId(PlatformEventType.TRAINING_RUN_STARTED, undefined)).not.toThrow();
    });
});
