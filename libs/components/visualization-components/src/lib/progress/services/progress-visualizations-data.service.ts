import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ProgressVisualizationApi } from '@crczp/visualization-api';
import { CommandLineEntry, ProgressVisualizationData } from '@crczp/visualization-model';

@Injectable()
export class ProgressVisualizationsDataService {
    private visualizationDataSubject$ = new Subject<ProgressVisualizationData>();
    private commandLineDataSubject$ = new Subject<CommandLineEntry[]>();

    public visualizationData$ = this.visualizationDataSubject$.asObservable();
    public commandLineData$ = this.commandLineDataSubject$.asObservable();

    constructor(private visualizationApi: ProgressVisualizationApi) {
    }

    getData(trainingInstanceId: number): Observable<ProgressVisualizationData> {
        return this.visualizationApi.getVisualizationData(trainingInstanceId).pipe(
            tap(
                (visualizationData) => {
                    this.visualizationDataSubject$.next(visualizationData);
                },
                (err) => {
                    console.log(err);
                },
            ),
        );
    }

    getCommandLineData(trainingInstanceId: number, trainingRunId: number): Observable<CommandLineEntry[]> {
        return this.visualizationApi.getTrainingRunData(trainingInstanceId, trainingRunId).pipe(
            tap(
                (commandLineData) => {
                    this.commandLineDataSubject$.next(commandLineData);
                },
                (err) => {
                    console.log(err);
                },
            ),
        );
    }
}
