import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject, Observable, tap} from 'rxjs';
import {TrainingInstanceStatisticsDTO} from './dtos';
import {map} from 'rxjs/operators';
import {TrainingInstanceMapper} from './mappers/training-instance-mapper';
import {TrainingInstanceStatistics} from '@crczp/visualization-model';
import {PortalConfig} from "@crczp/common";


@Injectable()
export class InstanceStatisticsApiService {
    private readonly http = inject(HttpClient);

    private readonly trainingInstancesSubject$: BehaviorSubject<TrainingInstanceStatistics[]> = new BehaviorSubject([]);
    readonly trainingInstance$: Observable<TrainingInstanceStatistics[]> = this.trainingInstancesSubject$.asObservable();
    private readonly trainingInstancesEndpoint = inject(PortalConfig).basePaths.linearTraining + 'training-instances';

    constructor() {
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
        return new HttpHeaders({Accept: 'application/json'});
    }
}
