import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ProgressVisualizationApi } from '@crczp/visualization-api';
import {
    CommandLineEntry,
    ProgressVisualizationData,
} from '@crczp/visualization-model';
import { ErrorHandlerService } from '@crczp/utils';

@Injectable()
export class ProgressVisualizationsDataService {
    private visualizationApi = inject(ProgressVisualizationApi);
    private errorService = inject(ErrorHandlerService);

    private visualizationDataSubject$ =
        new Subject<ProgressVisualizationData>();
    public visualizationData$ = this.visualizationDataSubject$.asObservable();
    private commandLineDataSubject$ = new Subject<CommandLineEntry[]>();
    public commandLineData$ = this.commandLineDataSubject$.asObservable();

    getData(trainingInstanceId: number): Observable<ProgressVisualizationData> {
        return this.visualizationApi
            .getVisualizationData(trainingInstanceId)
            .pipe(
                tap(
                    (visualizationData) => {
                        this.visualizationDataSubject$.next(visualizationData);
                    },
                    (err) => {
                        this.errorService.emitAPIError(
                            err,
                            'Fetching visualization data.'
                        );
                    }
                )
            );
    }

    getCommandLineData(
        trainingInstanceId: number,
        trainingRunId: number
    ): Observable<CommandLineEntry[]> {
        return this.visualizationApi
            .getAdaptiveRunVisualization(trainingInstanceId, trainingRunId)
            .pipe(
                tap(
                    (commandLineData) => {
                        this.commandLineDataSubject$.next(commandLineData);
                    },
                    (err) => {
                        this.errorService.emitAPIError(
                            err,
                            'Fetching visualization data.'
                        );
                    }
                )
            );
    }
}
