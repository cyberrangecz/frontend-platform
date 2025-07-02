import {HttpClient} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {AssessmentMapper} from './mappers/assessment-mapper';
import {VisualizationApiConfig} from '../config/visualization-api-config';
import {AssessmentDTO} from './dtos';
import {Assessment} from '@crczp/visualization-model';

/**
 * Service abstracting http communication with endpoint
 */
@Injectable()
export class AssessmentApi {
    private http = inject(HttpClient);
    private config = inject(VisualizationApiConfig);

    private readonly visualizationsEndpoint: string;

    constructor() {
        this.visualizationsEndpoint = `${this.config.trainingBasePath}/visualizations`;
    }

    /**
     * Sends http request to retrieve all assessments to be displayed in the visualization
     * @param instanceId id of instance
     */
    getAssessments(instanceId: number): Observable<Assessment[]> {
        return this.http
            .get<AssessmentDTO[]>(`${this.visualizationsEndpoint}/training-instances/${instanceId}/assessments`)
            .pipe(map((response) => AssessmentMapper.fromDTOs(response)));
    }
}
