import { computed, Signal } from '@angular/core';
import { and, Column, eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable, of } from 'rxjs';
import {
    assessmentAnswersTable,
    commandTable,
    correctAnswerSubmittedTable,
    EventCacheDb,
    hintTakenTable,
    levelStartedTable,
    solutionDisplayedTable,
    trainingRunEndedTable,
    trainingRunResumedTable,
    trainingRunStartedTable,
    wrongAnswerSubmittedTable,
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/training-model';

import { createQuerySource, QuerySource } from '../shared';
import {
    buildEventTimelineVm,
    CommandRawRow,
    CorrectRow,
    EMPTY_AGGREGATE,
    EventTimelineAggregate,
    HintRow,
    LevelStartedRow,
    RunEndedRow,
    RunStartedRow,
    SolutionRow,
    WrongRow,
} from './event-timeline.compute';
import { EventTimelineVm } from './event-timeline.model';

/**
 * Builds the combined query for one run: its lifecycle, level, answer, hint, solution and
 * assessment events (run-scoped), plus the instance's commands (sandbox-scoped in the
 * reducer, since command rows carry no run id).
 *
 * @param db          The typed event-cache database.
 * @param instanceId  Instance the run belongs to.
 * @param runId       Selected training run id; non-positive when no run is selected.
 * @returns Observable emitting a single-element aggregate array.
 */
function buildTimelineQuery(
    db: EventCacheDb,
    instanceId: number,
    runId: number,
): Observable<EventTimelineAggregate[]> {
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

    const runEnded$ = from(
        db
            .select({ timestamp: trainingRunEndedTable.timestamp, end_time: trainingRunEndedTable.end_time })
            .from(trainingRunEndedTable)
            .where(runScope(trainingRunEndedTable.instance_id, trainingRunEndedTable.training_run_id)) as Promise<
            RunEndedRow[]
        >,
    );

    const runResumed$ = from(
        db
            .select({ timestamp: trainingRunResumedTable.timestamp })
            .from(trainingRunResumedTable)
            .where(runScope(trainingRunResumedTable.instance_id, trainingRunResumedTable.training_run_id)) as Promise<
            { timestamp: number }[]
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

    const wrong$ = from(
        db
            .select({
                level_order: wrongAnswerSubmittedTable.level_order,
                timestamp: wrongAnswerSubmittedTable.timestamp,
                answer_content: wrongAnswerSubmittedTable.answer_content,
                count: wrongAnswerSubmittedTable.count,
            })
            .from(wrongAnswerSubmittedTable)
            .where(runScope(wrongAnswerSubmittedTable.instance_id, wrongAnswerSubmittedTable.training_run_id)) as Promise<
            WrongRow[]
        >,
    );

    const correct$ = from(
        db
            .select({
                level_order: correctAnswerSubmittedTable.level_order,
                timestamp: correctAnswerSubmittedTable.timestamp,
                answer_content: correctAnswerSubmittedTable.answer_content,
            })
            .from(correctAnswerSubmittedTable)
            .where(runScope(correctAnswerSubmittedTable.instance_id, correctAnswerSubmittedTable.training_run_id)) as Promise<
            CorrectRow[]
        >,
    );

    const hint$ = from(
        db
            .select({
                level_order: hintTakenTable.level_order,
                timestamp: hintTakenTable.timestamp,
                hint_title: hintTakenTable.hint_title,
                hint_penalty_points: hintTakenTable.hint_penalty_points,
            })
            .from(hintTakenTable)
            .where(runScope(hintTakenTable.instance_id, hintTakenTable.training_run_id)) as Promise<HintRow[]>,
    );

    const solution$ = from(
        db
            .select({
                level_order: solutionDisplayedTable.level_order,
                timestamp: solutionDisplayedTable.timestamp,
                penalty_points: solutionDisplayedTable.penalty_points,
            })
            .from(solutionDisplayedTable)
            .where(runScope(solutionDisplayedTable.instance_id, solutionDisplayedTable.training_run_id)) as Promise<
            SolutionRow[]
        >,
    );

    const assessment$ = from(
        db
            .select({
                level_order: assessmentAnswersTable.level_order,
                timestamp: assessmentAnswersTable.timestamp,
            })
            .from(assessmentAnswersTable)
            .where(runScope(assessmentAnswersTable.instance_id, assessmentAnswersTable.training_run_id)) as Promise<
            { level_order: number; timestamp: number }[]
        >,
    );

    const commands$ = from(
        db
            .select({
                command: commandTable.command,
                command_arguments: commandTable.command_arguments,
                sandbox_id: commandTable.sandbox_id,
                timestamp: commandTable.timestamp,
                cmd_type: commandTable.cmd_type,
                hostname: commandTable.hostname,
                username: commandTable.username,
                wd: commandTable.wd,
                ip: commandTable.ip,
            })
            .from(commandTable)
            .where(eq(commandTable.instance_id, instanceId)) as Promise<CommandRawRow[]>,
    );

    return combineLatest([
        runStarted$,
        runEnded$,
        runResumed$,
        levelStarted$,
        wrong$,
        correct$,
        hint$,
        solution$,
        assessment$,
        commands$,
    ]).pipe(
        map(
            ([runStarted, runEnded, runResumed, levelStarted, wrong, correct, hint, solution, assessment, commands]): EventTimelineAggregate[] => [
                { runStarted, runEnded, runResumed, levelStarted, wrong, correct, hint, solution, assessment, commands },
            ],
        ),
    );
}

/**
 * Live source for one run's event timeline. Polls the run's lifecycle, level, answer,
 * hint, solution, assessment and command events, joins the pause gate, and auto-stops
 * past instance end.
 *
 * @param instanceId  Reactive instance id scoping the queries.
 * @param runId       Reactive selected run id, or null when no run is selected.
 * @returns A query source emitting the event-timeline view model.
 */
export function createEventTimelineSource(
    instanceId: Signal<number>,
    runId: Signal<number | null>,
): QuerySource<EventTimelineVm> {
    const runIdParam = computed(() => runId() ?? 0);
    return createQuerySource<EventTimelineAggregate, EventTimelineVm, number>({
        instanceId,
        param: runIdParam,
        eventTypes: [
            PlatformEventType.TRAINING_RUN_STARTED,
            PlatformEventType.TRAINING_RUN_RESUMED,
            PlatformEventType.TRAINING_RUN_ENDED,
            PlatformEventType.LEVEL_STARTED,
            PlatformEventType.WRONG_ANSWER_SUBMITTED,
            PlatformEventType.CORRECT_ANSWER_SUBMITTED,
            PlatformEventType.HINT_TAKEN,
            PlatformEventType.SOLUTION_DISPLAYED,
            PlatformEventType.ASSESSMENT_ANSWERS,
            PlatformEventType.COMMAND,
        ],
        live: true,
        query: (db, ctx) => buildTimelineQuery(db, ctx.instanceId, ctx.param),
        map: (rows) => buildEventTimelineVm(rows[0] ?? EMPTY_AGGREGATE),
        isEmpty: (vm) => vm.runStartTimestamp === null,
    });
}
