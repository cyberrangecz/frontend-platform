import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { catchError, combineLatest, from, map, Observable, of, shareReplay, switchMap, throwError } from 'rxjs';
import {
    assessmentAnswersTable,
    EntityResolverService,
    EntityType,
    EventCacheDb,
} from '@crczp/event-query-engine';
import { LinearTrainingDefinitionApi } from '@crczp/training-api';
import { AssessmentLevel, TrainingUser } from '@crczp/training-model';
import { PlatformEventType } from '@crczp/visualization-model';
import { createQuerySource, QuerySource } from '../shared';
import { AssessmentAnswerRow, assembleAssessmentDashboard, EMPTY_DASHBOARD } from './assessment-assembly';
import { AssessmentDashboardVm } from './assessment-view.model';

/**
 * The three inputs the assembly reconciles, bundled per polling cycle. Wrapped
 * in a single-element array to satisfy the row shape of the query source.
 */
interface AssessmentInput {
    /** The run's assessment levels from the training definition. */
    readonly levels: readonly AssessmentLevel[];
    /** Every assessment-answer submission for the instance. */
    readonly rows: readonly AssessmentAnswerRow[];
    /** Resolved trainee identities keyed by user id. */
    readonly users: ReadonlyMap<number, TrainingUser>;
}

/**
 * Queries every assessment-answer submission for the instance, projecting the
 * fields the assembly joins on.
 *
 * @param db         The local event-cache database.
 * @param instanceId The instance to scope the query to.
 */
function buildAnswerRowsQuery(db: EventCacheDb, instanceId: number): Observable<AssessmentAnswerRow[]> {
    return from(
        db
            .select({
                training_run_id: assessmentAnswersTable.training_run_id,
                user_ref_id: assessmentAnswersTable.user_ref_id,
                training_definition_id: assessmentAnswersTable.training_definition_id,
                level_id: assessmentAnswersTable.level_id,
                level_order: assessmentAnswersTable.level_order,
                timestamp: assessmentAnswersTable.timestamp,
                answers: assessmentAnswersTable.answers,
            })
            .from(assessmentAnswersTable)
            .where(eq(assessmentAnswersTable.instance_id, instanceId)) as Promise<AssessmentAnswerRow[]>,
    );
}

/**
 * Creates a live-polling query source for the assessment dashboard view-model.
 *
 * The live event query feeds the assembly together with the run's training
 * definition and resolved trainee identities. The definition is fetched once
 * per definition id and cached (a poll only re-reads the events and re-resolves
 * users — both HTTP-cached), so polling never refetches the definition.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId    Reactive signal carrying the training instance id.
 * @param resolver      Entity resolver for trainee identity lookups.
 * @param definitionApi Definition API used to fetch the run's assessment levels.
 * @returns Query source whose view-model reconciles every assessment level, or
 *          null before the first emission.
 */
export function createAssessmentSource(
    instanceId: Signal<number>,
    resolver: EntityResolverService,
    definitionApi: LinearTrainingDefinitionApi,
): QuerySource<AssessmentDashboardVm> {
    const definitionCache = new Map<number, Observable<readonly AssessmentLevel[]>>();

    const definitionLevels = (definitionId: number): Observable<readonly AssessmentLevel[]> => {
        const cached = definitionCache.get(definitionId);
        if (cached !== undefined) {
            return cached;
        }
        const levels$ = definitionApi.get(definitionId, true).pipe(
            map((definition) =>
                definition.levels.filter((level): level is AssessmentLevel => level instanceof AssessmentLevel),
            ),
            shareReplay({ bufferSize: 1, refCount: false }),
            catchError((error) => {
                definitionCache.delete(definitionId);
                return throwError(() => error);
            }),
        );
        definitionCache.set(definitionId, levels$);
        return levels$;
    };

    return createQuerySource<AssessmentInput, AssessmentDashboardVm>({
        instanceId,
        eventTypes: [PlatformEventType.ASSESSMENT_ANSWERS],
        live: true,
        query: (db, ctx) =>
            buildAnswerRowsQuery(db, ctx.instanceId).pipe(
                switchMap((rows) => {
                    const first = rows[0];
                    if (first === undefined) {
                        return of<AssessmentInput[]>([
                            { levels: [], rows: [], users: new Map<number, TrainingUser>() },
                        ]);
                    }
                    const userIds = [...new Set(rows.map((row) => row.user_ref_id))];
                    return combineLatest({
                        levels: definitionLevels(first.training_definition_id),
                        users: resolver.resolveMap(EntityType.User, userIds),
                    }).pipe(map(({ levels, users }) => [{ levels, rows, users }]));
                }),
            ),
        map: (inputs) => {
            const input = inputs[0];
            return input ? assembleAssessmentDashboard(input.levels, input.rows, input.users) : EMPTY_DASHBOARD;
        },
        isEmpty: (vm) => vm.assessments.length === 0,
    });
}
