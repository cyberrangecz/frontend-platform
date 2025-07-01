import { PaginatedResource } from '@sentinel/common/pagination';
import { AccessedTrainingRun, TraineeAccessTrainingRunActionEnum, TrainingRunTypeEnum } from '@crczp/training-model';
import { Column, Row, RowAction, SentinelTable } from '@sentinel/components/table';
import { defer, EMPTY, of } from 'rxjs';
import { AccessedTrainingRunService } from '../services/state/training/accessed-training-run.service';
import { AccessedTrainingRunRowAdapter } from './accessed-training-run-row-adapter';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class AccessedTrainingRunTable extends SentinelTable<AccessedTrainingRunRowAdapter> {
    constructor(resource: PaginatedResource<AccessedTrainingRun>, service: AccessedTrainingRunService) {
        const columns = [
            new Column('trainingInstanceTitle', 'title', false),
            new Column('trainingInstanceFormattedDuration', 'Time slot', false),
            new Column('completedLevels', 'Completed Levels', false),
        ];

        const sortByInstanceDateAndState = (a: AccessedTrainingRun, b: AccessedTrainingRun): number => {
            if (a.action !== b.action) {
                return a.action === TraineeAccessTrainingRunActionEnum.Resume ? -1 : 1;
            }
            return b.trainingInstanceStartTime.getTime() - a.trainingInstanceStartTime.getTime();
        };

        const rows = resource.elements
            .sort(sortByInstanceDateAndState)
            .map((element) => AccessedTrainingRunTable.createRow(element, service));
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

    private static createActions(trainingRun: AccessedTrainingRun, service: AccessedTrainingRunService): RowAction[] {
        return [
            new RowAction(
                'resume',
                'Resume',
                'open_in_new',
                'primary',
                'Resume training run',
                of(trainingRun.action !== TraineeAccessTrainingRunActionEnum.Resume),
                defer(() =>
                    trainingRun.type === TrainingRunTypeEnum.LINEAR
                        ? service.resumeLinear(trainingRun.trainingRunId)
                        : service.resumeAdaptive(trainingRun.trainingRunId),
                ),
            ),
            new RowAction(
                'results',
                'Access Results',
                'assessment',
                'primary',
                'Access Results',
                of(trainingRun.action !== TraineeAccessTrainingRunActionEnum.Results),
                defer(() => {
                    switch (trainingRun.type) {
                        case TrainingRunTypeEnum.LINEAR:
                            service.resultsLinear(trainingRun.trainingRunId);
                            break;
                        case TrainingRunTypeEnum.ADAPTIVE:
                            service.resultsAdaptive(trainingRun.trainingRunId);
                            break;
                    }
                    return EMPTY;
                }),
            ),
        ];
    }
}
