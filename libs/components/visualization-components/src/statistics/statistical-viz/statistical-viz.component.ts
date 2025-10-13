import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {BehaviorSubject, Observable, take} from 'rxjs';
import {IStatisticsFilter, TrainingInstanceStatistics} from '@crczp/visualization-model';
import {map} from 'rxjs/operators';
import {InstanceStatisticsApiService} from '@crczp/visualization-api';
import {MatSidenavModule} from '@angular/material/sidenav';
import {BubblechartComponent} from '../bubblechart/bubblechart.component';
import {ClusteringWrapperComponent} from '../clustering-wrapper/clustering-wrapper.component';
import {ScatterClustersWrapperComponent} from '../scatter-clusters-wrapper/scatter-clusters-wrapper.component';
import {RadarChartWrapperComponent} from '../radar-chart-wrapper/radar-chart-wrapper.component';
import {BarchartComponent} from '../barchart/barchart.component';
import {ScatterplotComponent} from '../scatterplot/scatterplot.component';
import {CombinedDiagramComponent} from '../combined-diagram/combined-diagram.component';
import {FilterComponent} from '../filters/filter.component';
import {MatExpansionModule} from '@angular/material/expansion';
import {AsyncPipe, CommonModule} from '@angular/common';

@Component({
    selector: 'crczp-statistical-visualization',
    templateUrl: './statistical-viz.component.html',
    imports: [
        CommonModule,
        MatSidenavModule,
        BubblechartComponent,
        ClusteringWrapperComponent,
        ScatterClustersWrapperComponent,
        RadarChartWrapperComponent,
        BarchartComponent,
        ScatterplotComponent,
        CombinedDiagramComponent,
        FilterComponent,
        MatExpansionModule,
        AsyncPipe
    ],
    styleUrls: ['./statistical-viz.component.css']
})
export class StatisticalVizComponent implements OnInit {
    // The order is important because the order of the visualizations is determined by the order of the names in the object.
    @Input() visualizationGrid: string[];

    // Determines what visualizations are displayed in the grid in which order.
    @Input() trainingDefinitionId: number;
    // instance id that should be selected in filters
    @Input() trainingInstanceId: number;
    @Output() openDetailView: EventEmitter<number> = new EventEmitter();
    trainingInstanceStatistics$: Observable<TrainingInstanceStatistics[]>;
    filteredTrainingInstanceStatistics$: Observable<TrainingInstanceStatistics[]>;
    highlightedTrainingInstanceSubject$: BehaviorSubject<number[]> = new BehaviorSubject(null);
    highlightedTrainingInstance$: Observable<number[]> = this.highlightedTrainingInstanceSubject$.asObservable();
    selectedLevelSubject$: BehaviorSubject<number> = new BehaviorSubject(null);
    selectedLevel$: Observable<number> = this.selectedLevelSubject$.asObservable();
    highlightedParticipantsSubject$: BehaviorSubject<number[]> = new BehaviorSubject(null);
    highlightedParticipants$: Observable<number[]> = this.highlightedParticipantsSubject$.asObservable();
    filters: IStatisticsFilter[] = [];
    private instanceStatisticsService = inject(InstanceStatisticsApiService);

    ngOnInit() {
        this.loadData();
    }

    filterChange(filters: IStatisticsFilter[]) {
        this.filters = filters;
        this.filteredTrainingInstanceStatistics$ = this.trainingInstanceStatistics$.pipe(
            map((trainingInstanceStatistics) =>
                trainingInstanceStatistics.filter((statistics) =>
                    this.filters.some((filter) => filter.instanceId == statistics.instanceId && filter.checked)
                )
            )
        );
    }

    highlightChange(instanceId: number[]): void {
        this.highlightedTrainingInstanceSubject$.next(instanceId);
    }

    highlightParticipants(participantId: number[]): void {
        this.highlightedParticipantsSubject$.next(participantId);
    }

    selectedLevel(levelId: number): void {
        this.selectedLevelSubject$.next(levelId);
    }

    detailView(instanceId: number): void {
        this.openDetailView.emit(instanceId);
    }

    private loadData() {
        this.trainingInstanceStatistics$ = this.instanceStatisticsService.trainingInstance$;
        this.filteredTrainingInstanceStatistics$ = this.trainingInstanceStatistics$;
        this.instanceStatisticsService.getAll(this.trainingDefinitionId).pipe(take(1)).subscribe();
    }
}
