import { Injectable } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { TrainingRun } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { TrainingRunSort } from '@crczp/training-api';
import { CrczpOffsetElementsPaginatedService, OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Layer between component and API service. Implement concrete service by extending this class.
 * Provide concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated resources and other actions to modify data.
 */
@Injectable()
export abstract class AdaptiveRunService extends CrczpOffsetElementsPaginatedService<TrainingRun> {
    protected constructor(defaultPaginationSize: number) {
        super(defaultPaginationSize);
    }

    /**
     * @param trainingInstanceId id of associated adaptive instance
     * @param pagination requested pagination
     */
    abstract getAll(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent<TrainingRunSort>,
    ): Observable<OffsetPaginatedResource<TrainingRun>>;
}
