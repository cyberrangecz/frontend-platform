import { inject, Injectable } from '@angular/core';
import { TraineeModeInfo } from '../../../../shared/interfaces/trainee-mode-info';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TimelineApiService } from '../../../api/timeline/timeline-api.service';
import { Timeline } from '../../../model/timeline/timeline';
import { TimelineMapper } from '../../../api/mappers/timeline/timeline-mapper';

@Injectable()
export class TimelineService {
    private timelineApiService = inject(TimelineApiService);

    getAllData(
        traineeModeInfo: TraineeModeInfo,
        trainingInstanceId: number,
    ): Observable<Timeline> {
        const service = TraineeModeInfo.isTrainee(traineeModeInfo)
            ? this.timelineApiService.getAnonymizedTimelineVisualizationData(
                  traineeModeInfo.trainingRunId,
              )
            : this.timelineApiService.getTimelineVisualizationData(
                  trainingInstanceId,
              );

        return service.pipe(
            map((data) => TimelineMapper.fromDTO(data)),
            catchError((error) => {
                return throwError(
                    'timeline service not connect to API: ' + error.message,
                );
            }),
        );
    }
}
