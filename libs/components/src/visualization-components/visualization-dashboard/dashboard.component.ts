import { ChangeDetectorRef, Component, HostListener, inject, Input } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatExpansionModule } from '@angular/material/expansion';
import {
    TrainingsVisualizationsOverviewLibModule
} from '../visualization-overview/trainings-visualizations-overview-lib.module';
import { CommonModule } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { CommandApi, ProgressVisualizationApi, TimelineCommandApi } from '@crczp/visualization-api';
import { TimelineCommandService } from '../command/command-timeline/timeline-command.service';
import { FiltersComponent } from '../visualization-overview/components/agenda/filters/filters.component';
import { ProgressVisualizationComponent } from '../progress/components/progress-visualization.component';
import { TraineeViewEnum } from './trainee-view';

@Component({
    selector: 'crczp-dashboard',
    templateUrl: './dashboard.component.html',
    imports: [
        CommonModule,
        MatSidenavModule,
        MatExpansionModule,
        MatOptionModule,
        MatSelectModule,
        TrainingsVisualizationsOverviewLibModule,
        FiltersComponent,
        ProgressVisualizationComponent,

    ],
    providers: [
        CommandApi,
        TimelineCommandApi,
        TimelineCommandService,
        ProgressVisualizationApi,
    ],
    styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
    @Input() trainingInstanceId: number;
    @Input() trainingDefinitionId: number;
    @Input() hasReferenceSolution: boolean;
    innerWidth = document.documentElement.clientWidth - 200;
    clusteringSize =
        innerWidth > 1550
            ? { width: innerWidth * 0.36, height: 400 }
            : { width: innerWidth * 0.7, height: 400 };
    timelineSize =
        innerWidth > 1550
            ? { width: innerWidth * 0.33, height: 400 }
            : { width: innerWidth * 0.7, height: 400 };
    protected selectedTraineeView: TraineeViewEnum = TraineeViewEnum.Both;
    private ref = inject(ChangeDetectorRef);
    private highlightedTraineeSubject$: BehaviorSubject<number> =
        new BehaviorSubject(null);
    highlightedTrainee$: Observable<number> =
        this.highlightedTraineeSubject$.asObservable();
    private filteredTraineesSubject$: BehaviorSubject<number[]> =
        new BehaviorSubject([]);
    filteredTrainees$: Observable<number[]> =
        this.filteredTraineesSubject$.asObservable();
    private lineTraineesSubject$: BehaviorSubject<number[]> =
        new BehaviorSubject([]);
    lineTrainees$: Observable<number[]> =
        this.lineTraineesSubject$.asObservable();
    private activeFiltersSubject$: BehaviorSubject<any[]> = new BehaviorSubject(
        [],
    );
    activeFilters$: Observable<any[]> =
        this.activeFiltersSubject$.asObservable();

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.innerWidth = document
            .getElementsByClassName('dashboard-container')[0]
            .getBoundingClientRect().width;
        if (document.documentElement.clientWidth < 1545) {
            this.clusteringSize.width = this.innerWidth * 0.7;
            this.timelineSize.width = this.innerWidth * 0.7;
        } else {
            this.clusteringSize.width = this.innerWidth * 0.36;
            this.timelineSize.width = this.innerWidth * 0.34;
        }
    }

    /**
     * Change the view of all trainees to avatars/names
     * @param view selected view
     */
    togglePlayerView(view: MatSelectChange): void {
        if (view.value === 'name') {
            this.selectedTraineeView = TraineeViewEnum.Name;
        } else if (view.value === 'both') {
            this.selectedTraineeView = TraineeViewEnum.Both;
        } else {
            this.selectedTraineeView = TraineeViewEnum.Avatar;
        }
    }

    /**
     * Updates subject of currently highlighted trainee
     * @param trainingRunId trainee training run id
     */
    highlightTraineeChange(trainingRunId: number): void {
        this.highlightedTraineeSubject$.next(trainingRunId);
    }

    /**
     * Updates subject of currently selected (displayed) trainees
     * @param trainingRunIds array of training runs
     */
    selectedTraineesChange(trainingRunIds: number[]): void {
        this.lineTraineesSubject$.next([...trainingRunIds]);
    }

    /**
     * Updates subject of currently active filters from event emitted by filter component
     * @param activeFilters object of active filters
     */
    filterChange(activeFilters: any): void {
        this.activeFiltersSubject$.next(activeFilters);
    }
}
