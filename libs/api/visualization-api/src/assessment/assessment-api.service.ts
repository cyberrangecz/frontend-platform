import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AssessmentMapper } from './mappers/assessment-mapper';
import { AssessmentDTO } from './dtos';
import { Assessment } from '@crczp/visualization-model';
import { PortalConfig } from '@crczp/utils';

/**
 * Service abstracting http communication with endpoint
 */
@Injectable()
export class AssessmentApi {
    private readonly http = inject(HttpClient);

    private readonly visualizationsEndpoint =
        inject(PortalConfig).basePaths.linearTraining + '/visualizations';

    constructor() {}

    /**
     * Sends http request to retrieve all assessments to be displayed in the visualization
     * @param instanceId id of instance
     */
    getAssessments(instanceId: number): Observable<Assessment[]> {
        return this.http
            .get<AssessmentDTO[]>(
                `${this.visualizationsEndpoint}/training-instances/${instanceId}/assessments`
            )
            .pipe(map((response) => AssessmentMapper.fromDTOs(response)));
    }
}
