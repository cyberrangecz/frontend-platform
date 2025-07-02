import { Injectable, inject } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject, Observable, tap} from 'rxjs';
import {TrainingInstanceStatisticsDTO} from './dtos';
import {map} from 'rxjs/operators';
import {TrainingInstanceMapper} from './mappers/training-instance-mapper';
import {TrainingInstanceStatistics} from '@crczp/visualization-model';
import {VisualizationApiConfig} from '../config/visualization-api-config';


@Injectable()
export class InstanceStatisticsApiService {
    private http = inject(HttpClient);

    protected trainingInstancesSubject$: BehaviorSubject<TrainingInstanceStatistics[]> = new BehaviorSubject([]);
    trainingInstance$: Observable<TrainingInstanceStatistics[]> = this.trainingInstancesSubject$.asObservable();
    private trainingInstancesEndpoint: string;

    constructor() {
        const config = inject(VisualizationApiConfig);

        this.trainingInstancesEndpoint = config.trainingBasePath + '/training-instances';
        if (config.trainingBasePath === undefined || config.trainingBasePath === null) {
            throw new Error(
                'StatisticalVizConfig is null or undefined. Please provide it in forRoot() method of StatisticalVisualizationModule' +
                ' or provide own implementation of API services'
            );
        }
    }

    getAll(definitionId: number): Observable<TrainingInstanceStatistics[]> {
        return this.http
            .get<TrainingInstanceStatisticsDTO[]>(
                `${this.trainingInstancesEndpoint}/training-definitions/${definitionId}`,
                {
                    headers: this.createDefaultHeaders()
                }
            )
            .pipe(
                map((response) => TrainingInstanceMapper.fromDTOs(response)),
                tap(instances => this.trainingInstancesSubject$.next(instances))
            );
    }

    private createDefaultHeaders() {
        return new HttpHeaders({ Accept: 'application/json' });
    }
}
