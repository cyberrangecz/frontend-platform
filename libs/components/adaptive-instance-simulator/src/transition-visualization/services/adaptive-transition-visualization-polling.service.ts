import {Injectable} from '@angular/core';
import {BehaviorSubject, merge, Observable, Subject, timer} from 'rxjs';
import {TransitionGraphVisualizationData} from '../model/transition-graph-visualization-data';
import {HttpErrorResponse} from '@angular/common/http';
import {retryWhen, shareReplay, switchMap, tap} from 'rxjs/operators';
import {AdaptiveTransitionVisualizationApi} from '../api/adaptive-transition-visualization-api.service';

@Injectable({
    providedIn: 'root',
})
export class AdaptiveTransitionVisualizationPollingService {
    visualizationData$!: Observable<TransitionGraphVisualizationData>;
    private lastTrainingInstanceId!: number;
    /**
     * True if server returned error response on the latest request, false otherwise
     * Change internally in extending service. Client should subscribe to the observable
     */
    private hasErrorSubject$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    /**
     * True if server returned error response on the latest request, false otherwise
     * @contract must be updated every time new data are received
     */
    hasError$: Observable<boolean> = this.hasErrorSubject$.asObservable();
    /**
     * True if response to the latest request was not yet received
     * Change internally in extending service. Client should subscribe to the observable
     */
    private isLoadingSubject$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
    /**
     * True if response to the latest request was not yet received
     * @contract must be updated every time new data are received
     */
    isLoading$: Observable<boolean> = this.isLoadingSubject$.asObservable();
    /**
     * Observable triggering retry of polling after it was interrupted (e.g. by error)
     */
    private retryPolling$: Subject<boolean> = new Subject<boolean>();
    private visualizationDataSubject$: BehaviorSubject<TransitionGraphVisualizationData> =
        new BehaviorSubject<TransitionGraphVisualizationData>(null as unknown as TransitionGraphVisualizationData);
    private pollPeriod: number;

    constructor(private visualizationApi: AdaptiveTransitionVisualizationApi) {
        this.pollPeriod = 2000;
        this.visualizationData$ = merge(this.createPoll(), this.visualizationDataSubject$.asObservable());
    }

    /**
     * Gets all visualization data and updates related observables or handles an error
     * @param trainingInstanceId id of training instance
     */
    getAll(trainingInstanceId: number): Observable<TransitionGraphVisualizationData> {
        this.onManualResourceRefresh(trainingInstanceId);
        return this.callApiToGetData(trainingInstanceId).pipe(
            tap(
                (data) => {
                    this.isLoadingSubject$.next(false);
                    this.visualizationDataSubject$.next(data);
                },
                (err) => this.onGetAllError(err),
            ),
        );
    }

    protected refreshData(): Observable<TransitionGraphVisualizationData> {
        this.hasErrorSubject$.next(false);
        return this.callApiToGetData(this.lastTrainingInstanceId).pipe(
            tap({error: (err) => this.onGetAllError(err)}),
        );
    }

    /**
     * Performs necessary operations and updates state of the service.
     */
    protected onManualResourceRefresh(trainingInstanceId: number): void {
        this.isLoadingSubject$.next(true);
        if (this.hasErrorSubject$.getValue()) {
            this.retryPolling$.next(true);
        }
        this.hasErrorSubject$.next(false);
        this.lastTrainingInstanceId = trainingInstanceId;
    }

    protected createPoll(): Observable<TransitionGraphVisualizationData> {
        return timer(this.pollPeriod, this.pollPeriod).pipe(
            switchMap(() => this.refreshData()),
            retryWhen(() => this.retryPolling$),
            shareReplay(Number.POSITIVE_INFINITY, this.pollPeriod),
        );
    }

    protected callApiToGetData(trainingInstanceId: number): Observable<TransitionGraphVisualizationData> {
        return this.visualizationApi.getDataForTrainingInstance(trainingInstanceId);
    }

    protected onGetAllError(err: HttpErrorResponse): void {
        this.hasErrorSubject$.next(true);
    }
}
