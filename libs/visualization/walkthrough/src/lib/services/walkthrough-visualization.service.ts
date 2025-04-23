import { Injectable } from '@angular/core';
import { WalkthroughVisualizationData } from '../model/walkthrough-visualization-data';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { WalkthroughVisualizationApi } from '../api/walkthrough-visualization-api.service';
import { Level } from '@crczp/training-model';

@Injectable()
export class WalkthroughVisualizationService {
    private levelDataSubject$: BehaviorSubject<WalkthroughVisualizationData> = new BehaviorSubject(null);
    levelData$: Observable<WalkthroughVisualizationData> = this.levelDataSubject$.asObservable();

    private levelsSubject$: BehaviorSubject<Level[]> = new BehaviorSubject([]);
    levels$: Observable<Level[]> = this.levelsSubject$.asObservable();

    constructor(private visualizationApi: WalkthroughVisualizationApi) {}

    getData(levelId: number, instanceId: number): Observable<WalkthroughVisualizationData> {
        return this.visualizationApi
            .getData(levelId, instanceId)
            .pipe(tap((data) => this.levelDataSubject$.next(data)));
    }
}
