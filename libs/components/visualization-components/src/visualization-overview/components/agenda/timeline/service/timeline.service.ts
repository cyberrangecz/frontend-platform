import {inject, Injectable} from '@angular/core';
import {VizOverviewTraineeInfo} from '../../../../shared/interfaces/viz-overview-trainee-info';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {TimelineApiService} from '../../../api/timeline/timeline-api.service';
import {Timeline} from '../../../model/timeline/timeline';
import {TimelineMapper} from '../../../api/mappers/timeline/timeline-mapper';

@Injectable()
export class TimelineService {
    private timelineApiService = inject(TimelineApiService);


    getAllData(traineeModeInfo: VizOverviewTraineeInfo): Observable<Timeline> {
        const service = VizOverviewTraineeInfo.isTrainee(traineeModeInfo)
            ? this.timelineApiService.getAnonymizedTimelineVisualizationData()
            : this.timelineApiService.getTimelineVisualizationData();

        return service.pipe(
            map((data) => TimelineMapper.fromDTO(data)),
            catchError((error) => {
                return throwError('timeline service not connect to API: ' + error.message);
            }),
        );
    }
}
