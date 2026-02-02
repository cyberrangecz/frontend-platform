import { CommonModule } from '@angular/common';
import {
    Component,
    computed,
    DestroyRef,
    HostListener,
    inject,
    input,
    model,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatOptionModule } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import {
    CommandApi,
    ProgressVisualizationApi,
    TimelineCommandApi,
} from '@crczp/visualization-api';
import {
    ProgressVisualizationApiData,
    TraineeProgressData,
} from '@crczp/visualization-model';
import { TimelineCommandService } from '../command/command-timeline/timeline-command.service';
import { ProgressVisualizationComponent } from '../progress/components/progress-visualization.component';
import { ProgressDataService } from '../progress/services/progress-data.service';
import { TraineeSelect } from '../trainee-select/trainee-select';
import { TrainingsVisualizationsOverviewLibModule } from '../visualization-overview/trainings-visualizations-overview-lib.module';
import { FiltersObject } from '../visualization-overview/services/filters/filters';

// Constant refrence required to avoid recreating empty array instance
// and triggering unnecessary updates
const EMPTY_TRAINEES: TraineeProgressData[] = [];

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
        ProgressVisualizationComponent,
        TraineeSelect,
        MatDivider,
    ],
    providers: [
        CommandApi,
        TimelineCommandApi,
        TimelineCommandService,
        ProgressVisualizationApi,
        ProgressDataService,
    ],
    styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
    trainingInstanceId = input.required<number>();
    trainingDefinitionId = input.required<number>();

    highlightedTrainee = model<TraineeProgressData | null>(null);

    filteredTrainees = signal<TraineeProgressData[]>([]);
    progressData = signal<ProgressVisualizationApiData | null>(null);

    innerWidth = document.documentElement.clientWidth - 200;
    clusteringSize =
        innerWidth > 1550
            ? { width: innerWidth * 0.36, height: 400 }
            : { width: innerWidth * 0.7, height: 400 };
    timelineSize =
        innerWidth > 1550
            ? { width: innerWidth * 0.33, height: 400 }
            : { width: innerWidth * 0.7, height: 400 };

    progressTrainees = computed(
        () => this.progressData()?.progress ?? EMPTY_TRAINEES,
    );

    filteredProgressData = computed(() => {
        const progress = this.progressData();
        const progressTrainees = this.filteredTrainees();
        if (!progress) return;
        return {
            ...progress,
            progress: progressTrainees,
        };
    });

    activeFilters = signal<FiltersObject>({});

    runIds = computed(() =>
        this.filteredTrainees().map((t) => t.trainingRunId),
    );

    progressApiDataObservable = toObservable(this.filteredProgressData);

    protected readonly destroyRef = inject(DestroyRef);
    private progressDataService = inject(ProgressDataService);

    /**
     * Initializes component and subscribes to progress data updates.
     */
    ngOnInit() {
        this.progressDataService
            .getVisualizationData$(this.trainingInstanceId())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                this.progressData.set(data);
            });
    }

    updateHighlightByTraineeId(traineeId: number) {
        this.highlightedTrainee.set(
            this.progressData()
                ? this.progressData()?.progress.find(
                      (t) => t.id === traineeId,
                  ) || null
                : null,
        );
    }

    updateHighlightByTrainingRunId(trainingRunId: number) {
        this.highlightedTrainee.set(
            this.progressData()
                ? this.progressData()?.progress.find(
                      (t) => t.trainingRunId === trainingRunId,
                  ) || null
                : null,
        );
    }

    @HostListener('window:resize')
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
}
