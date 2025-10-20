import { AccessedTrainingRun, TraineeAccessTrainingRunActionEnum } from '@crczp/training-model';
import { Column, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { AccessedTrainingRunService } from '../services/state/accessed-training-run.service';
import { AccessedTrainingRunRowAdapter } from './accessed-training-run-row-adapter';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class AccessedTrainingRunTable extends SentinelTable<
    AccessedTrainingRunRowAdapter,
    string
> {
    constructor(
        resource: OffsetPaginatedResource<AccessedTrainingRun>,
        service: AccessedTrainingRunService,
    ) {
        const columns = [
            new Column<string>('trainingInstanceTitle', 'title', false),
            new Column<string>(
                'trainingInstanceFormattedDuration',
                'Time slot',
                false,
            ),
            new Column<string>('completedLevels', 'Completed Levels', false),
        ];

        const sortByInstanceDateAndState = (
            a: AccessedTrainingRun,
            b: AccessedTrainingRun,
        ): number => {
            if (a.action !== b.action) {
                return a.action === TraineeAccessTrainingRunActionEnum.Resume
                    ? -1
                    : 1;
            }
            return (
                b.trainingInstanceStartTime.getTime() -
                a.trainingInstanceStartTime.getTime()
            );
        };

        const rows = resource.elements
            .sort(sortByInstanceDateAndState)
            .map((element) =>
                AccessedTrainingRunTable.createRow(element, service),
            );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = false;
        this.selectable = false;
    }

    private static createRow(
        accessedTrainingRun: AccessedTrainingRun,
        service: AccessedTrainingRunService,
    ): Row<AccessedTrainingRunRowAdapter> {
        const adapter = accessedTrainingRun as AccessedTrainingRunRowAdapter;
        return new Row(adapter, this.createActions(adapter, service));
    }

    private static createActions(
        trainingRun: AccessedTrainingRun,
        service: AccessedTrainingRunService,
    ): RowAction[] {
        return [
            new RowAction(
                'resume',
                'Resume',
                'open_in_new',
                'primary',
                'Resume training run',
                of(
                    trainingRun.action !==
                        TraineeAccessTrainingRunActionEnum.Resume,
                ),
                defer(() =>
                    service.toResumeRun(
                        trainingRun.trainingRunId,
                        trainingRun.type,
                    ),
                ),
            ),
            new RowAction(
                'results',
                'Access Results',
                'assessment',
                'primary',
                'Access Results',
                of(
                    trainingRun.action !==
                        TraineeAccessTrainingRunActionEnum.Results,
                ),
                defer(() =>
                    service.toRunResults(
                        trainingRun.trainingRunId,
                        trainingRun.type,
                    ),
                ),
            ),
        ];
    }
}
