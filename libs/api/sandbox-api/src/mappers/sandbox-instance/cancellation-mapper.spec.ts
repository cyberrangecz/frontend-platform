import { describe, expect, it } from 'vitest';
import { CancellationMapper } from './cancellation-mapper';
import { RequestStageMapper } from './request-stage-mapper';

describe('CancellationMapper', () => {
    it('maps the stop pending answer', () => {
        expect(
            CancellationMapper.stopPendingFromDTO({ stop_pending: true })
                .stopPending,
        ).toBe(true);
    });

    it('maps every unit of the Cancel all allocations answer', () => {
        const units = CancellationMapper.unitsFromDTO({
            units: [
                {
                    unit_id: 3,
                    stack_name: 'stack-3',
                    action: 'stopped',
                    stop_pending: true,
                    reason: '',
                },
                {
                    unit_id: 4,
                    stack_name: 'stack-4',
                    action: 'failed',
                    stop_pending: false,
                    reason: 'queue unreachable',
                },
            ],
        });

        expect(units).toHaveLength(2);
        expect(units[0]).toMatchObject({
            unitId: 3,
            stackName: 'stack-3',
            action: 'stopped',
            stopPending: true,
            reason: '',
        });
        expect(units[1]).toMatchObject({
            unitId: 4,
            action: 'failed',
            stopPending: false,
            reason: 'queue unreachable',
        });
    });

    it('maps an answer without units to an empty list', () => {
        expect(CancellationMapper.unitsFromDTO({ units: [] })).toEqual([]);
    });
});

describe('RequestStageMapper stop pending', () => {
    const stageDTO = {
        id: 1,
        request_id: 2,
        start: new Date('2026-10-23T10:00:00Z'),
        end: null as unknown as Date,
        failed: false,
        error_message: '',
    };

    it('reads stop_pending from the stage', () => {
        const stage = RequestStageMapper.fromTerraformCleanupDTO({
            ...stageDTO,
            stop_pending: true,
            stop_requested_at: null,
        });
        expect(stage.stopPending).toBe(true);
    });

    it('reads stop_requested_at from the stage', () => {
        const requestedAt = new Date('2026-10-23T11:00:00Z');
        const stage = RequestStageMapper.fromTerraformCleanupDTO({
            ...stageDTO,
            stop_pending: true,
            stop_requested_at: requestedAt,
        });
        expect(stage.stopRequestedAt).toEqual(requestedAt);
    });

    it('defaults to not pending when the field is absent', () => {
        const stage = RequestStageMapper.fromTerraformCleanupDTO(
            stageDTO as never,
        );
        expect(stage.stopPending).toBe(false);
    });
});
