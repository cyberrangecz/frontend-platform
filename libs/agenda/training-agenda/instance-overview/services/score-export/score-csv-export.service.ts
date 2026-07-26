import { inject, Injectable, Injector, runInInjectionContext, signal } from '@angular/core';
import { catchError, combineLatest, from, map, Observable, switchMap, take, throwError } from 'rxjs';
import { DataBrokerService, EntityResolverService, EntityType } from '@crczp/event-query-engine';
import { ErrorHandlerService } from '@crczp/utils';
import { TrainingUser } from '@crczp/training-model';
import {
    CsvExportable,
    exportCsv,
    ResolvedInstanceLevels,
    resolveInstanceLevels,
    SCORE_BEARING_EVENT_TYPES,
} from '@crczp/components';
import {
    assembleScoreExportRows,
    ScoreExportRow,
    scoreExportColumns,
    selectScoredLevels,
} from './score-export-row';
import { buildScoreExportQuery, ScoreExportAggregate } from './score-export.query';

/** Operation name reported alongside a failed export. */
const EXPORT_OPERATION = 'Exporting training instance scores';

/**
 * Produces the per-trainee score CSV for a training instance from the local event
 * cache.
 *
 * One pull gathers every score-bearing event for the instance, joins it with the
 * training definition's level list and the resolved trainees, and downloads the
 * result. Scores are read from the absolute snapshots the events already carry —
 * per-level standing from each level's latest completion, run totals from the
 * latest-by-timestamp cumulative pair — so the export never re-derives penalties.
 *
 * The export is a one-shot read: it takes the cache's state at the moment it is
 * invoked and does not observe later events.
 */
@Injectable({ providedIn: 'root' })
export class ScoreCsvExportService {
    private readonly broker = inject(DataBrokerService);
    private readonly entityResolver = inject(EntityResolverService);
    private readonly errorHandler = inject(ErrorHandlerService);
    private readonly injector = inject(Injector);

    /**
     * Pulls the instance's events and downloads the score CSV. Every run that has
     * started is included; a run still in progress carries its partial scores with
     * the end and duration columns blank.
     *
     * @param instanceId  The training instance to export.
     * @returns Observable emitting true once the download has been handed off, or
     *          false when the export failed and the error has been reported.
     */
    export(instanceId: number): Observable<boolean> {
        const instanceIdSignal = signal(instanceId);

        return combineLatest({
            rows: this.broker.query(instanceIdSignal, [...SCORE_BEARING_EVENT_TYPES], (db) =>
                buildScoreExportQuery(db, instanceId),
            ),
            resolved: runInInjectionContext(this.injector, () =>
                resolveInstanceLevels(instanceIdSignal, this.entityResolver),
            ),
        }).pipe(
            take(1),
            switchMap(({ rows, resolved }) => {
                const aggregate = rows[0];
                if (aggregate === undefined || resolved === null) {
                    return throwError(
                        () => new Error(`Training instance ${instanceId} could not be resolved`),
                    );
                }
                if (resolved.levels.length === 0) {
                    return throwError(
                        () =>
                            new Error(
                                `Training definition of instance ${instanceId} could not be resolved, so the export would carry no level columns`,
                            ),
                    );
                }
                return this.downloadCsv(aggregate, resolved, instanceId);
            }),
            catchError((err) =>
                this.errorHandler.emitAPIError(err, EXPORT_OPERATION).pipe(map(() => false)),
            ),
        );
    }

    /**
     * Resolves the trainees behind the pulled runs, derives the ranked rows, and
     * hands the assembled CSV to the browser.
     *
     * @param aggregate   Every event-cache read for the instance.
     * @param resolved    The resolved instance and its ordered level list.
     * @param instanceId  The exported instance, naming the downloaded file.
     * @returns Observable emitting true once the download has been handed off.
     */
    private downloadCsv(
        aggregate: ScoreExportAggregate,
        resolved: ResolvedInstanceLevels,
        instanceId: number,
    ): Observable<boolean> {
        const userIds = [...new Set(aggregate.timingRows.map((row) => row.user_ref_id))];

        return this.entityResolver.resolveMap(EntityType.User, userIds).pipe(
            take(1),
            switchMap((userMap: ReadonlyMap<number, TrainingUser>) => {
                const rows = assembleScoreExportRows(
                    aggregate,
                    resolved.levels,
                    userMap,
                    resolved.instance.endTime.getTime(),
                    Date.now(),
                );
                const columns = scoreExportColumns(selectScoredLevels(resolved.levels));
                const exportable: CsvExportable<ScoreExportRow> = {
                    csvFilename: () => `training-instance-${instanceId}-scores`,
                    csvColumns: () => columns,
                    csvRows: () => rows,
                };
                return from(exportCsv(exportable));
            }),
            map(() => true),
        );
    }
}
