import { DatePipe } from '@angular/common';
import { Column, DeleteAction, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { CheatingDetection, CheatingDetectionStateEnum } from '@crczp/training-model';
import { CheatingDetectionRowAdapter } from './cheating-detection-row-adapter';
import { CheatingDetectionService } from '../services/cheating-detection.service';
import { defer, of } from 'rxjs';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class CheatingDetectionTable extends SentinelTable<
    CheatingDetectionRowAdapter,
    string
> {
    constructor(
        resource: OffsetPaginatedResource<CheatingDetection>,
        service: CheatingDetectionService,
    ) {
        const columns = [
            new Column<string>('id', 'id', false),
            new Column<string>('executeTimeFormatted', 'executed at', false),
            new Column<string>('executedBy', 'executed by', false),
            new Column<string>('currentState', 'state', false),
            new Column<string>('resultsFormatted', 'results', false),
            new Column<string>('stages', 'stages', false),
        ];
        const rows = resource.elements.map((element) =>
            CheatingDetectionTable.createRow(element, service),
        );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = false;
    }

    private static createRow(
        element: CheatingDetection,
        service: CheatingDetectionService,
    ): Row<CheatingDetectionRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as CheatingDetectionRowAdapter;

        adapter.resultsFormatted =
            adapter.currentState === CheatingDetectionStateEnum.Finished
                ? adapter.results.toString()
                : null;
        adapter.executeTimeFormatted = `${datePipe.transform(
            adapter.executeTime,
        )}`;
        adapter.stages = this.requestStageResolver(element);
        return new Row(adapter, this.createActions(element, service));
    }

    private static createActions(
        cd: CheatingDetection,
        service: CheatingDetectionService,
    ): RowAction[] {
        return [...this.createStateActions(cd, service)];
    }

    private static createStateActions(
        cd: CheatingDetection,
        service: CheatingDetectionService,
    ): RowAction[] {
        switch (cd.currentState) {
            case CheatingDetectionStateEnum.Finished:
                return [
                    new RowAction(
                        'results',
                        'Results',
                        'assessment',
                        'primary',
                        'show results',
                        of(false),
                        defer(() =>
                            service.toDetectionEventsOfCheatingDetection(
                                cd.trainingInstanceId,
                                cd.id,
                            ),
                        ),
                    ),
                    new RowAction(
                        'archive',
                        'Get Archive',
                        'cloud_download',
                        'primary',
                        'Download ZIP file containing all cheating detection data',
                        of(false),
                        defer(() => service.download(cd.id)),
                    ),
                    new RowAction(
                        'runAgain',
                        'Run Again',
                        'run_circle',
                        'primary',
                        'Rerun Cheating Detection',
                        of(false),
                        defer(() =>
                            service.rerun(cd.id, cd.trainingInstanceId),
                        ),
                    ),
                    new DeleteAction(
                        'Delete cheating detection',
                        of(false),
                        defer(() =>
                            service.delete(cd.id, cd.trainingInstanceId),
                        ),
                    ),
                ];
            default:
                return [];
        }
    }

    private static requestStageResolver(data: CheatingDetection) {
        const proximityThreshold =
            data.proximityThreshold != null
                ? ' proximity: ' + data.proximityThreshold + ' sec'
                : '';
        return [
            'Answer similarity detection: ' + data.answerSimilarityState,
            'Location proximity detection: ' + data.locationSimilarityState,
            'Time proximity detection: ' +
                data.timeProximityState +
                proximityThreshold,
            'Minimal solve time detection: ' + data.minimalSolveTimeState,
            'No commands detection: ' + data.noCommandsState,
            'Forbidden commands detection: ' + data.forbiddenCommandsState,
        ];
    }
}
