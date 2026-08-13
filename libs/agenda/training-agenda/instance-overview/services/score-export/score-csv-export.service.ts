import { inject, Injectable } from '@angular/core';
import { catchError, from, map, Observable, switchMap, take } from 'rxjs';
import { LinearTrainingInstanceApi } from '@crczp/training-api';
import { ErrorHandlerService } from '@crczp/utils';
import { ParticipantScoreRow } from '@crczp/training-model';
import { CsvExportable, exportCsv } from '@crczp/components';
import { scoreExportColumns } from './score-export-row';

/** Operation name reported alongside a failed export. */
const EXPORT_OPERATION = 'Exporting training instance scores';

/**
 * Produces the per-trainee score CSV for a training instance.
 *
 * The standings, their ranking and the level columns they break down by are
 * derived server-side; this service serializes the reported rows and hands the
 * result to the browser.
 */
@Injectable()
export class ScoreCsvExportService {
    private readonly trainingInstanceApi = inject(LinearTrainingInstanceApi);
    private readonly errorHandler = inject(ErrorHandlerService);

    /**
     * Fetches the instance's score report and downloads it as CSV. Every run that has
     * started is included; a run still in progress carries its partial scores with the
     * end and duration columns blank.
     *
     * @param instanceId  The training instance to export.
     * @returns Observable emitting true once the download has been handed off, or
     *          false when the export failed and the error has been reported.
     */
    export(instanceId: number): Observable<boolean> {
        return this.trainingInstanceApi.getScoreReport(instanceId).pipe(
            take(1),
            switchMap((report) => {
                const columns = scoreExportColumns(report.scoredLevels);
                const exportable: CsvExportable<ParticipantScoreRow> = {
                    csvFilename: () => `training-instance-${instanceId}-scores`,
                    csvColumns: () => columns,
                    csvRows: () => report.rows,
                };
                return from(exportCsv(exportable));
            }),
            map(() => true),
            catchError((err) =>
                this.errorHandler.emitAPIError(err, EXPORT_OPERATION).pipe(map(() => false)),
            ),
        );
    }
}
