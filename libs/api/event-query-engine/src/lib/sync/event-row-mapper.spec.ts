import { describe, expect, it } from 'vitest';
import { mapToRawEventRows } from './event-row-mapper';

describe('mapToRawEventRows', () => {
    it('returns an empty array for empty input', () => {
        expect(mapToRawEventRows([], 'level_started', 7)).toEqual([]);
    });

    it('maps 1:1, converting ISO timestamp to UTC epoch-ms, renaming fields, injecting type/instance_id, passing through extras', () => {
        const eventType = 'level_started';
        const instanceId = 42;
        const dto: Record<string, unknown> = {
            timestamp: '2024-01-01T00:00:00',
            level: 3,
            event_id: 'abc-123',
            sandbox_id: 'sandbox-9',
            type: 'SomeDtoClassName',
            instance_id: 999,
            custom_field: 'carried',
        };

        const rows = mapToRawEventRows([dto], eventType, instanceId);

        expect(rows).toHaveLength(1);
        const row = rows[0]!;

        const expectedMilliseconds = Date.UTC(2024, 0, 1, 0, 0, 0);
        expect(row.timestamp).toBe(expectedMilliseconds);

        expect(row['level_id']).toBe(3);
        expect('level' in row).toBe(false);

        expect(row.id).toBe('abc-123');
        expect('event_id' in row).toBe(false);

        expect(row.type).toBe(eventType);

        expect(row.instance_id).toBe(instanceId);

        expect(row.sandbox_id).toBe('sandbox-9');
        expect(row['custom_field']).toBe('carried');
    });

    it('uses a numeric timestamp as-is', () => {
        const numericTimestamp = 1_700_000_000_000;
        const dto: Record<string, unknown> = {
            timestamp: numericTimestamp,
            sandbox_id: 'sandbox-1',
        };

        const rows = mapToRawEventRows([dto], 'hint_taken', 1);

        expect(rows[0]!.timestamp).toBe(numericTimestamp);
    });
});
