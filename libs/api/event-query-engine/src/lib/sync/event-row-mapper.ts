import { RawEventRow } from '../cache/cache.interface';

/**
 * Maps raw HTTP event DTOs returned by the training-instances events endpoint to RawEventRow records
 * suitable for insertion into the local SQLite cache.
 *
 * The DTO carries snake_case field names (enforced via @JsonProperty on the Java side), with two
 * exceptions that require explicit transformation:
 *  - `timestamp` arrives as an ISO-8601 LocalDateTime string and must be converted to epoch ms.
 *  - `level` (no @JsonProperty) must be renamed to `level_id` to match the cache schema column.
 *
 * `type` is overridden with the PlatformEventType string used as the routing key in eventTables —
 * the Java class name carried in the DTO is not valid for that purpose.
 *
 * `instance_id` is injected from the request parameters; it is not present in the DTO body.
 *
 * `id` is intentionally omitted — the cache DB generates it via crypto.randomUUID().
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

function mapToRawEventRow(
    dto: Record<string, unknown>,
    eventType: string,
    instanceId: number,
): RawEventRow {
    const { timestamp, level, type: _type, ...rest } = dto;
    return {
        ...rest,
        type: eventType,
        instance_id: instanceId,
        timestamp: new Date(timestamp as string).getTime(),
        ...(level !== undefined && { level_id: level }),
    };
}
