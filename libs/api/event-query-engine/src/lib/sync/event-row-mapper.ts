import { parseISO } from 'date-fns';
import { RawEventRow } from '../cache/cache.interface';

/**
 * Maps raw HTTP event DTOs returned by the training-instances events endpoint to RawEventRow records
 * suitable for insertion into the local SQLite cache.
 *
 * The DTO carries snake_case field names (enforced via @JsonProperty on the Java side), with these
 * exceptions that require explicit transformation:
 *  - `timestamp`, and `start_time` / `end_time` where present, arrive as UTC ISO-8601 strings with a `Z`
 *    designator and must be converted to epoch ms.
 *  - `level` (no @JsonProperty) must be renamed to `level_id` to match the cache schema column.
 *  - `event_id` carries the source Elasticsearch document id and is renamed to `id`, the cache primary key.
 *
 * `type` is overridden with the PlatformEventType string used as the routing key in eventTables —
 * the Java class name carried in the DTO is not valid for that purpose.
 *
 * `instance_id` is injected from the request parameters; it is not present in the DTO body.
 *
 * `id` is populated from `event_id`; rows with a duplicate `id` are ignored on insert (deduplication at
 * the primary key level). When `event_id` is absent the cache DB generates a UUID via crypto.randomUUID().
 *
 * @param dtos - Raw deserialized JSON objects from the HTTP response.
 * @param eventType - PlatformEventType string used as the cache routing key.
 * @param instanceId - Training instance ID scoping all returned events.
 */
export function mapToRawEventRows(
    dtos: Record<string, unknown>[],
    eventType: string,
    instanceId: number,
): RawEventRow[] {
    return dtos.map((dto) => mapToRawEventRow(dto, eventType, instanceId));
}

function toEpochMilliseconds(value: unknown): number {
    return parseISO(value as string).getTime();
}

function mapToRawEventRow(
    dto: Record<string, unknown>,
    eventType: string,
    instanceId: number,
): RawEventRow {
    const { event_id, timestamp, start_time, end_time, level, type: _type, sandbox_id, ...rest } = dto;
    return {
        ...rest,
        ...(start_time !== undefined && { start_time: toEpochMilliseconds(start_time) }),
        ...(end_time !== undefined && { end_time: toEpochMilliseconds(end_time) }),
        ...(event_id !== undefined && { id: event_id as string }),
        type: eventType,
        instance_id: instanceId,
        sandbox_id: sandbox_id as string,
        timestamp: toEpochMilliseconds(timestamp),
        ...(level !== undefined && { level_id: level }),
    };
}
