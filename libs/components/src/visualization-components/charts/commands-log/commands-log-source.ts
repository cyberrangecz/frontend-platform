import { computed, Signal } from '@angular/core';
import { and, Column, eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable, of } from 'rxjs';
import {
    commandTable,
    EventCacheDb,
    levelStartedTable,
    trainingRunStartedTable,
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/training-model';

import { createQuerySource, QuerySource } from '../shared';

/** training_run_started: start time, owner, and sandbox of the selected run. */
interface RunStartedRow {
    readonly timestamp: number;
    readonly user_ref_id: number;
    readonly sandbox_id: string;
}

/** level_started: level order, entry time, and sandbox, for command-to-level attribution. */
interface LevelStartedRow {
    readonly level_order: number;
    readonly timestamp: number;
    readonly sandbox_id: string;
}

/** One raw command row for the instance, scoped to the run by sandbox membership in the reducer. */
interface CommandRawRow {
    readonly id: string;
    readonly command: string;
    readonly command_arguments: string | null;
    readonly sandbox_id: string;
    readonly timestamp: number;
    readonly training_time: number | null;
    readonly hostname: string | null;
    readonly username: string | null;
    readonly wd: string | null;
    readonly ip: string | null;
}

/** All raw sub-query results for one run, gathered in a single polling cycle. */
interface CommandsLogAggregate {
    readonly runStarted: readonly RunStartedRow[];
    readonly levelStarted: readonly LevelStartedRow[];
    readonly commands: readonly CommandRawRow[];
}

/** Empty aggregate emitted when no run is selected. */
const EMPTY_AGGREGATE: CommandsLogAggregate = {
    runStarted: [],
    levelStarted: [],
    commands: [],
};

/** One fully prepared command entry, attributed to its active level and run offset. */
export interface CommandLogEntry {
    /** Stable command event id, used as the table track-by key. */
    readonly id: string;
    /** Seconds elapsed from the run start to this command. */
    readonly offsetSeconds: number;
    /** Seconds elapsed since the previous command in the run, or null for the first command. */
    readonly secondsSincePreviousCommand: number | null;
    /** Base command/tool name. */
    readonly tool: string;
    /** Raw argument string; empty when the command had no arguments. */
    readonly commandArguments: string;
    /** Full command line: tool followed by arguments. */
    readonly commandLine: string;
    /** 0-based order of the level active when the command ran, or null when unattributable. */
    readonly levelOrder: number | null;
    /** Seconds elapsed since the active level started, or null when unattributable. */
    readonly secondsIntoLevel: number | null;
    /** Identifier of the sandbox the command ran in. */
    readonly sandboxId: string;
    /** Host the command ran on, or null. */
    readonly hostname: string | null;
    /** OS user the command ran as, or null. */
    readonly username: string | null;
    /** Working directory at command time, or null. */
    readonly workingDirectory: string | null;
    /** Source IP the command originated from, or null. */
    readonly ipAddress: string | null;
    /** Absolute millisecond timestamp of the command. */
    readonly timestamp: number;
}

/** The commands-log view model: one run's commands oldest-first, plus the run owner's id. */
export interface CommandsLogVm {
    /** Commands attributed to the run, ordered oldest-first. */
    readonly entries: readonly CommandLogEntry[];
    /** The run owner's user id, for on-demand trainee resolution in the CSV; null when unknown. */
    readonly userId: number | null;
}

/** Empty view model emitted when the run has no start row (no run selected or not yet synced). */
const EMPTY_VM: CommandsLogVm = { entries: [], userId: null };

/**
 * Builds the per-run query: the run's start row and level starts (run-scoped), plus the
 * instance's command rows (sandbox-scoped in the reducer, since command rows carry no run id).
 *
 * @param db          The typed event-cache database.
 * @param instanceId  Instance the run belongs to.
 * @param runId       Selected training run id; non-positive when no run is selected.
 * @returns Observable emitting a single-element aggregate array.
 */
function buildCommandsLogQuery(
    db: EventCacheDb,
    instanceId: number,
    runId: number,
): Observable<CommandsLogAggregate[]> {
    if (runId <= 0) {
        return of([EMPTY_AGGREGATE]);
    }

    const runScope = (instanceColumn: Column, runColumn: Column) =>
        and(eq(instanceColumn, instanceId), eq(runColumn, runId));

    const runStarted$ = from(
        db
            .select({
                timestamp: trainingRunStartedTable.timestamp,
                user_ref_id: trainingRunStartedTable.user_ref_id,
                sandbox_id: trainingRunStartedTable.sandbox_id,
            })
            .from(trainingRunStartedTable)
            .where(runScope(trainingRunStartedTable.instance_id, trainingRunStartedTable.training_run_id)) as Promise<
            RunStartedRow[]
        >,
    );

    const levelStarted$ = from(
        db
            .select({
                level_order: levelStartedTable.level_order,
                timestamp: levelStartedTable.timestamp,
                sandbox_id: levelStartedTable.sandbox_id,
            })
            .from(levelStartedTable)
            .where(runScope(levelStartedTable.instance_id, levelStartedTable.training_run_id)) as Promise<
            LevelStartedRow[]
        >,
    );

    const commands$ = from(
        db
            .select({
                id: commandTable.id,
                command: commandTable.command,
                command_arguments: commandTable.command_arguments,
                sandbox_id: commandTable.sandbox_id,
                timestamp: commandTable.timestamp,
                training_time: commandTable.training_time,
                hostname: commandTable.hostname,
                username: commandTable.username,
                wd: commandTable.wd,
                ip: commandTable.ip,
            })
            .from(commandTable)
            .where(eq(commandTable.instance_id, instanceId)) as Promise<CommandRawRow[]>,
    );

    return combineLatest([runStarted$, levelStarted$, commands$]).pipe(
        map(([runStarted, levelStarted, commands]): CommandsLogAggregate[] => [
            { runStarted, levelStarted, commands },
        ]),
    );
}

/** The level active at a command's time: the latest level entered at or before it. */
interface ActiveLevel {
    /** 0-based order of the active level, or null when none had started yet. */
    readonly order: number | null;
    /** Entry timestamp of the active level, or null when none had started yet. */
    readonly startTimestamp: number | null;
}

/**
 * Builds a level-at-timestamp resolver from the run's level starts: the order and entry time
 * of the latest level entered at or before a given time, or nulls when none had started yet.
 *
 * @param starts  The run's level_started rows.
 * @returns A function mapping a timestamp to its active level.
 */
function levelAtResolver(starts: readonly LevelStartedRow[]): (timestamp: number) => ActiveLevel {
    const ordered = [...starts].sort((left, right) => left.timestamp - right.timestamp);
    return (timestamp: number): ActiveLevel => {
        let active: LevelStartedRow | null = null;
        for (const row of ordered) {
            if (row.timestamp > timestamp) break;
            active = row;
        }
        return { order: active?.level_order ?? null, startTimestamp: active?.timestamp ?? null };
    };
}

/**
 * Reduces the raw aggregate to the commands-log view model: resolves the run owner and start,
 * scopes commands to the run's sandboxes, attributes each to its active level, derives the run
 * offset, and returns them oldest-first.
 *
 * @param aggregate  Combined query output for one run.
 * @returns The view model, or the empty model when the run has no start row.
 */
function buildCommandsLogVm(aggregate: CommandsLogAggregate): CommandsLogVm {
    const started = aggregate.runStarted[0];
    if (started === undefined) return EMPTY_VM;

    const runStartTimestamp = started.timestamp;
    const levelAt = levelAtResolver(aggregate.levelStarted);

    const sandboxes = new Set<string>([started.sandbox_id]);
    for (const row of aggregate.levelStarted) sandboxes.add(row.sandbox_id);

    const scoped = aggregate.commands
        .filter((row) => sandboxes.has(row.sandbox_id))
        .sort((left, right) => left.timestamp - right.timestamp);

    const entries = scoped.map((row, index): CommandLogEntry => {
        const commandArguments = row.command_arguments ?? '';
        const active = levelAt(row.timestamp);
        const previous = index > 0 ? scoped[index - 1] : undefined;
        return {
            id: row.id,
            offsetSeconds: row.training_time ?? Math.max(0, (row.timestamp - runStartTimestamp) / 1000),
            secondsSincePreviousCommand:
                previous === undefined ? null : Math.max(0, (row.timestamp - previous.timestamp) / 1000),
            tool: row.command,
            commandArguments,
            commandLine: commandArguments ? `${row.command} ${commandArguments}` : row.command,
            levelOrder: active.order,
            secondsIntoLevel:
                active.startTimestamp === null ? null : Math.max(0, (row.timestamp - active.startTimestamp) / 1000),
            sandboxId: row.sandbox_id,
            hostname: row.hostname,
            username: row.username,
            workingDirectory: row.wd,
            ipAddress: row.ip,
            timestamp: row.timestamp,
        };
    });

    return { entries, userId: started.user_ref_id };
}

/**
 * Live source for one run's console-command log. Polls the run's start, level starts and the
 * instance's commands, joins the pause gate, and auto-stops past instance end.
 *
 * @param instanceId  Reactive instance id scoping the queries.
 * @param runId       Reactive selected run id, or null when no run is selected.
 * @returns A query source emitting the commands-log view model.
 */
export function createCommandsLogSource(
    instanceId: Signal<number>,
    runId: Signal<number | null>,
): QuerySource<CommandsLogVm> {
    const runIdParam = computed(() => runId() ?? 0);
    return createQuerySource<CommandsLogAggregate, CommandsLogVm, number>({
        instanceId,
        param: runIdParam,
        eventTypes: [
            PlatformEventType.TRAINING_RUN_STARTED,
            PlatformEventType.LEVEL_STARTED,
            PlatformEventType.COMMAND,
        ],
        live: true,
        query: (db, ctx) => buildCommandsLogQuery(db, ctx.instanceId, ctx.param),
        map: (rows) => buildCommandsLogVm(rows[0] ?? EMPTY_AGGREGATE),
        isEmpty: (vm) => vm.entries.length === 0,
    });
}
