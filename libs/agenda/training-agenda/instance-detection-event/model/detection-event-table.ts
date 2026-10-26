import { DatePipe } from '@angular/common';
import { Column, RowAction } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { AbstractDetectionEvent, AbstractDetectionEventTypeEnum } from '@crczp/training-model';
import { DetectionEventRowAdapter } from './detection-event-row-adapter';
import { defer, of } from 'rxjs';
import { OffsetPaginatedResource } from '@crczp/api-common';
import { DetectionEventOverviewService } from '../services/detection-event-overview.service';
import { AbstractDetectionEventSort } from '@crczp/training-api';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class DetectionEventTable extends TableModel<
    DetectionEventRowAdapter,
    AbstractDetectionEventSort
> {
    constructor(
        resource: OffsetPaginatedResource<AbstractDetectionEvent>,
        service: DetectionEventOverviewService,
    ) {
        const columns = [
            new Column<AbstractDetectionEventSort>(
                'levelOrder',
                'level order',
                true,
                'levelOrder',
            ),
            new Column<AbstractDetectionEventSort>(
                'levelTitle',
                'level title',
                true,
                'levelTitle',
            ),
            new Column<AbstractDetectionEventSort>(
                'levelId',
                'level id',
                true,
                'levelId',
            ),
            new Column<AbstractDetectionEventSort>(
                'participantCount',
                'number of participants',
                true,
                'participantCount',
            ),
            new Column<AbstractDetectionEventSort>(
                'participants',
                'participants',
                false,
            ),
            new Column<AbstractDetectionEventSort>(
                'detectionEventTypeFormatted',
                'detection type',
                true,
                'detectionEventType',
            ),
        ];
        const rows = resource.elements.map((element) =>
            DetectionEventTable.createRow(element, service),
        );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = false;
    }

    private static createRow(
        element: AbstractDetectionEvent,
        service: DetectionEventOverviewService,
    ): LinkedRow<DetectionEventRowAdapter> {
        const datePipe = new DatePipe('en-EN');
        const adapter = element as DetectionEventRowAdapter;

        adapter.detectedAtFormatted = `${datePipe.transform(
            adapter.detectedAt,
        )}`;
        adapter.detectionEventTypeFormatted = this.evaluateEventTypeString(
            adapter.detectionEventType,
        );
        return new LinkedRow(adapter, this.createActions(element, service));
    }

    private static evaluateEventTypeString(
        type: AbstractDetectionEventTypeEnum,
    ): string {
        switch (type) {
            case AbstractDetectionEventTypeEnum.Answer_similarity:
                return 'Answer similarity';
            case AbstractDetectionEventTypeEnum.Location_similarity:
                return 'Location similarity';
            case AbstractDetectionEventTypeEnum.Time_proximity:
                return 'Time proximity';
            case AbstractDetectionEventTypeEnum.Minimal_solve_time:
                return 'Minimal solve time';
            case AbstractDetectionEventTypeEnum.No_commands:
                return 'No commands';
            case AbstractDetectionEventTypeEnum.Forbidden_commands:
                return 'Forbidden commands';
            default:
                return 'Undefined';
        }
    }

    private static createActions(
        de: AbstractDetectionEvent,
        service: DetectionEventOverviewService,
    ): RowAction[] {
        return [...this.createStateActions(de, service)];
    }

    private static createStateActions(
        de: AbstractDetectionEvent,
        service: DetectionEventOverviewService,
    ): RowAction[] {
        return [
            new RowAction(
                'showDetail',
                'Show Event Detail',
                'assessment',
                'primary',
                'Show detection event detailed information',
                of(false),
                defer(() =>
                    service.toDetectionEventDetail(
                        de.trainingInstanceId,
                        de.cheatingDetectionId,
                        de.id,
                    ),
                ),
            ),
        ];
    }
}
