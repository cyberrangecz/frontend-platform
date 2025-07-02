import { Injectable, inject } from '@angular/core';
import {BehaviorSubject, Observable, tap} from 'rxjs';
import {Level} from '@crczp/training-model';
import {WalkthroughVisualizationApi} from '@crczp/visualization-api';
import {WalkthroughVisualizationData} from '@crczp/visualization-model';

@Injectable()
export class WalkthroughVisualizationService {
    private visualizationApi = inject(WalkthroughVisualizationApi);

    private levelDataSubject$: BehaviorSubject<WalkthroughVisualizationData> = new BehaviorSubject(null);
    levelData$: Observable<WalkthroughVisualizationData> = this.levelDataSubject$.asObservable();

    private levelsSubject$: BehaviorSubject<Level[]> = new BehaviorSubject([]);
    levels$: Observable<Level[]> = this.levelsSubject$.asObservable();

    getData(levelId: number, instanceId: number): Observable<WalkthroughVisualizationData> {
        return this.visualizationApi
            .getData(levelId, instanceId)
            .pipe(tap((data) => this.levelDataSubject$.next(data)));
    }
}
