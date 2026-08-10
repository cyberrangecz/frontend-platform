import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable } from 'rxjs';
import { commandTable, EventCacheDb, levelStartedTable } from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/training-model';
import { createQuerySource, QuerySource } from '../shared';

/**
 * Raw column subset selected from the command table for correlation.
 * Only the columns required for level attribution and aggregation are fetched.
 */
export interface CommandRow {
    /** Base tool name, e.g. `john` or `nmap`. */
    readonly command: string;
    /** Raw argument string, or null when invoked with no arguments. */
    readonly command_arguments: string | null;
    /** Identifier of the sandbox that produced this event. */
    readonly sandbox_id: string;
    /** Millisecond Unix timestamp of the command event. */
    readonly timestamp: number;
}

/**
 * Raw column subset selected from the level_started table for correlation.
 * Only the columns required for sandbox-to-level attribution are fetched.
 */
export interface CommandLevelStartedRow {
    /** Identifier of the sandbox in which the trainee's session runs. */
    readonly sandbox_id: string;
    /** 0-based order of the level within the training definition. */
    readonly level_order: number;
    /** Stable user identifier for the trainee who started this level. */
    readonly user_ref_id: number;
    /** Millisecond Unix timestamp of when the trainee entered this level. */
    readonly timestamp: number;
}

/**
 * Container for both raw sub-query results gathered in a single polling cycle.
 * Wrapped in an array to satisfy the `TRow[]` contract of {@link QuerySourceConfig}.
 */
export interface CommandsAggregateRow {
    readonly commandRows: readonly CommandRow[];
    readonly levelStartedRows: readonly CommandLevelStartedRow[];
}

/** A single argument-variant aggregation for one tool on one level. */
export interface CommandVariant {
    /** Raw argument string; empty string when the command was invoked without arguments. */
    readonly opt: string;
    /** Total number of times this exact variant was issued on the level. */
    readonly uses: number;
    /** Number of distinct trainees who issued this exact variant on the level. */
    readonly trainees: number;
}

/** Aggregated view of one tool's usage on a single level. */
export interface CommandTool {
    /** Base tool executable name, e.g. `john` or `hashcat`. */
    readonly tool: string;
    /** Total invocations of any variant of this tool on the level. */
    readonly uses: number;
    /** Number of distinct trainees who used any variant of this tool on the level. */
    readonly trainees: number;
    /** Argument variants sorted by uses descending. */
    readonly variants: readonly CommandVariant[];
}

/** Aggregated command usage for a single level. */
export interface CommandLevel {
    /** Number of distinct trainees who issued any command on this level. */
    readonly levelTrainees: number;
    /** All tools on this level sorted by total uses descending. */
    readonly sortedTools: readonly CommandTool[];
}

/**
 * A single command event after level and trainee attribution.
 * Carries the raw invocation detail alongside the resolved level and user.
 */
export interface CorrelatedCommand {
    /** 0-based level order to which this command was attributed. */
    readonly levelOrder: number;
    /** Base tool name of the command. */
    readonly tool: string;
    /** Raw argument string; empty string when no arguments were supplied. */
    readonly opt: string;
    /** Stable user identifier of the trainee who issued the command. */
    readonly userRefId: number;
    /** Millisecond Unix timestamp of the command event. */
    readonly timestamp: number;
}

/** Complete view model produced by the commands live source. */
export interface CommandsVm {
    /** Per-level aggregated command data, keyed by 0-based level order. */
    readonly byLevel: ReadonlyMap<number, CommandLevel>;
    /** All correlated command events in the order they were processed. */
    readonly events: readonly CorrelatedCommand[];
    /** Total number of correlated command events (events with an attributable sandbox). */
    readonly totalCommands: number;
}

/**
 * Derives {@link CommandsVm} from raw command and level-started rows by attributing
 * every command to the level and trainee active at its timestamp. Pure function with
 * no Angular or RxJS dependencies.
 *
 * Attribution algorithm:
 * - Build a per-sandbox sorted timeline of level-started events.
 * - For each command, locate its sandbox's timeline.
 *   Commands whose sandbox has no level-started rows are skipped (unattributable).
 * - The bucket level is the last level-started row with `timestamp <= command.timestamp`;
 *   when all level-started rows post-date the command, the first row is used.
 * - Accumulate uses and distinct trainees into nested maps keyed by
 *   level_order → tool → opt, then flatten into the output shape.
 *
 * @param commandRows       Raw command rows from the event cache.
 * @param levelStartedRows  Raw level-started rows from the event cache.
 * @returns                 Fully correlated and aggregated view model.
 */
export function correlateCommands(
    commandRows: readonly CommandRow[],
    levelStartedRows: readonly CommandLevelStartedRow[],
): CommandsVm {
    const sandboxTimeline = new Map<string, CommandLevelStartedRow[]>();
    for (const levelRow of levelStartedRows) {
        let list = sandboxTimeline.get(levelRow.sandbox_id);
        if (list === undefined) {
            list = [];
            sandboxTimeline.set(levelRow.sandbox_id, list);
        }
        list.push(levelRow);
    }
    for (const list of sandboxTimeline.values()) {
        list.sort((a, b) => a.timestamp - b.timestamp);
    }

    type VariantAccumulator = { count: number; traineeSet: Set<number> };
    type ToolAccumulator = { variants: Map<string, VariantAccumulator>; traineeSet: Set<number> };
    const byLevelRaw = new Map<number, { tools: Map<string, ToolAccumulator>; traineeSet: Set<number> }>();

    const correlatedEvents: CorrelatedCommand[] = [];

    for (const commandRow of commandRows) {
        const timeline = sandboxTimeline.get(commandRow.sandbox_id);
        if (timeline === undefined || timeline.length === 0) continue;

        const firstEntry = timeline[0];
        if (firstEntry === undefined) continue;

        let bucket: CommandLevelStartedRow = firstEntry;
        for (const levelEntry of timeline) {
            if (levelEntry.timestamp <= commandRow.timestamp) {
                bucket = levelEntry;
            } else {
                break;
            }
        }

        const tool = commandRow.command;
        const opt = commandRow.command_arguments ?? '';
        const levelOrder = bucket.level_order;
        const userRefId = bucket.user_ref_id;

        correlatedEvents.push({ levelOrder, tool, opt, userRefId, timestamp: commandRow.timestamp });

        let levelAccumulator = byLevelRaw.get(levelOrder);
        if (levelAccumulator === undefined) {
            levelAccumulator = { tools: new Map(), traineeSet: new Set() };
            byLevelRaw.set(levelOrder, levelAccumulator);
        }
        levelAccumulator.traineeSet.add(userRefId);

        let toolAccumulator = levelAccumulator.tools.get(tool);
        if (toolAccumulator === undefined) {
            toolAccumulator = { variants: new Map(), traineeSet: new Set() };
            levelAccumulator.tools.set(tool, toolAccumulator);
        }
        toolAccumulator.traineeSet.add(userRefId);

        let variantAccumulator = toolAccumulator.variants.get(opt);
        if (variantAccumulator === undefined) {
            variantAccumulator = { count: 0, traineeSet: new Set() };
            toolAccumulator.variants.set(opt, variantAccumulator);
        }
        variantAccumulator.count++;
        variantAccumulator.traineeSet.add(userRefId);
    }

    const byLevel = new Map<number, CommandLevel>();
    for (const [levelOrder, levelAccumulator] of byLevelRaw) {
        const sortedTools: CommandTool[] = [];
        for (const [toolName, toolAccumulator] of levelAccumulator.tools) {
            const variants: CommandVariant[] = [];
            for (const [opt, variantAccumulator] of toolAccumulator.variants) {
                variants.push({ opt, uses: variantAccumulator.count, trainees: variantAccumulator.traineeSet.size });
            }
            variants.sort((a, b) => b.uses - a.uses);
            const toolUses = variants.reduce((sum, variant) => sum + variant.uses, 0);
            sortedTools.push({
                tool: toolName,
                uses: toolUses,
                trainees: toolAccumulator.traineeSet.size,
                variants,
            });
        }
        sortedTools.sort((a, b) => b.uses - a.uses);
        byLevel.set(levelOrder, {
            levelTrainees: levelAccumulator.traineeSet.size,
            sortedTools,
        });
    }

    return { byLevel, events: correlatedEvents, totalCommands: correlatedEvents.length };
}

/**
 * Fetches commands and level-started rows for the instance and combines them
 * into a single {@link CommandsAggregateRow} for use by {@link createCommandsLiveSource}.
 *
 * @param db               The local event-cache database.
 * @param instanceIdValue  Instance ID scoping both queries.
 */
function buildCommandsQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<CommandsAggregateRow[]> {
    const commandQuery$ = from(
        db
            .select({
                command: commandTable.command,
                command_arguments: commandTable.command_arguments,
                sandbox_id: commandTable.sandbox_id,
                timestamp: commandTable.timestamp,
            })
            .from(commandTable)
            .where(eq(commandTable.instance_id, instanceIdValue)) as Promise<CommandRow[]>,
    );

    const levelStartedQuery$ = from(
        db
            .select({
                sandbox_id: levelStartedTable.sandbox_id,
                level_order: levelStartedTable.level_order,
                user_ref_id: levelStartedTable.user_ref_id,
                timestamp: levelStartedTable.timestamp,
            })
            .from(levelStartedTable)
            .where(eq(levelStartedTable.instance_id, instanceIdValue)) as Promise<CommandLevelStartedRow[]>,
    );

    return combineLatest([commandQuery$, levelStartedQuery$]).pipe(
        map(([commandRows, levelStartedRows]) => [{ commandRows, levelStartedRows }]),
    );
}

/**
 * Maps the single-element aggregate row into a {@link CommandsVm} by delegating
 * to the pure {@link correlateCommands} function.
 *
 * @param rows  Array with exactly one element containing both sub-query results.
 * @returns     Fully correlated and aggregated commands view model.
 */
function mapCommandsRows(rows: readonly CommandsAggregateRow[]): CommandsVm {
    const combined = rows[0];
    if (combined === undefined) {
        return { byLevel: new Map(), events: [], totalCommands: 0 };
    }
    return correlateCommands(combined.commandRows, combined.levelStartedRows);
}

/**
 * Creates a live-polling {@link QuerySource} that correlates command events with
 * level-started events to produce per-level command aggregations.
 *
 * Polls on the dashboard cadence, participates in the pause gate, and stops once
 * the instance end-time has passed.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId  Reactive signal carrying the training instance ID.
 * @returns           Query source whose vm emits {@link CommandsVm}, or null while
 *                    no data has been received yet.
 */
export function createCommandsLiveSource(instanceId: Signal<number>): QuerySource<CommandsVm> {
    return createQuerySource<CommandsAggregateRow, CommandsVm>({
        instanceId,
        eventTypes: [PlatformEventType.COMMAND, PlatformEventType.LEVEL_STARTED],
        live: true,
        query: (db, ctx) => buildCommandsQuery(db, ctx.instanceId),
        map: (rows) => mapCommandsRows(rows),
        isEmpty: (vm) => vm.totalCommands === 0,
    });
}
