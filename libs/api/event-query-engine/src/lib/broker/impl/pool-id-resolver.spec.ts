import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { needsPoolId, resolvePoolId } from './pool-id-resolver';
import { PlatformEventType } from '@crczp/visualization-model';
import { LinearTrainingInstanceApi } from '@crczp/training-api';

describe('needsPoolId', () => {
    it('returns true when event types includes COMMAND', () => {
        expect(needsPoolId([PlatformEventType.COMMAND])).toBe(true);
    });

    it('returns true when COMMAND is mixed with non-pool-scoped types', () => {
        expect(needsPoolId([PlatformEventType.LEVEL_STARTED, PlatformEventType.COMMAND])).toBe(true);
    });

    it('returns false when event types does not include COMMAND', () => {
        expect(needsPoolId([PlatformEventType.TRAINING_RUN_STARTED])).toBe(false);
    });

    it('returns false for empty array', () => {
        expect(needsPoolId([])).toBe(false);
    });
});

describe('resolvePoolId', () => {
    it('returns of(undefined) when no COMMAND types present', async () => {
        const mockInstanceApi = {
            get: vi.fn(),
        } as unknown as LinearTrainingInstanceApi;

        const result = await firstValueFrom(
            resolvePoolId(1, [PlatformEventType.TRAINING_RUN_STARTED], mockInstanceApi),
        );
        expect(result).toBeUndefined();
        expect(mockInstanceApi.get).not.toHaveBeenCalled();
    });

    it('calls instanceApi.get and maps to poolId when COMMAND is present', async () => {
        const mockInstanceApi = {
            get: vi.fn().mockReturnValue(of({ poolId: 42 })),
        } as unknown as LinearTrainingInstanceApi;

        const result = await firstValueFrom(
            resolvePoolId(1, [PlatformEventType.COMMAND], mockInstanceApi),
        );
        expect(result).toBe(42);
        expect(mockInstanceApi.get).toHaveBeenCalledWith(1);
    });
});
