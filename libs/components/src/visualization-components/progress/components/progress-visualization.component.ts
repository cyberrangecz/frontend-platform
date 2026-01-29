import {
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    OnInit,
    signal,
} from '@angular/core';
import { ProgressVisualizationApi } from '@crczp/visualization-api';
import { ProgressDataService } from '../services/progress-data.service';
import {
    ProgressLevelInfo,
    ProgressVisualizationApiData,
} from '@crczp/visualization-model';
import { ProgressChartComponent } from './progress-chart/progress-chart.component';
import { Level } from '@crczp/training-model';
import { Stepper, StepperItem } from '../../../stepper/stepper';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-progress-visualization',
    imports: [ProgressChartComponent, Stepper],
    templateUrl: './progress-visualization.component.html',
    styleUrl: './progress-visualization.component.scss',
    providers: [ProgressVisualizationApi, ProgressDataService],
})
export class ProgressVisualizationComponent implements OnInit {
    instanceId = input.required<number>();
    protected progressData = signal<ProgressVisualizationApiData>({
        startTime: 0,
        estimatedEndTime: 0,
        endTime: 0,
        levels: [],
        progress: [],
    });
    protected readonly stepperLevels = computed((): StepperItem[] =>
        this.progressData().levels.map((level) => ({
            label: this.buildStepperLevelLabel(level),
            icon: Level.getLevelByType(level.levelType),
        })),
    );
    protected highlightedLevelIndex = signal<number | null>(null);
    protected selectedLevelIndex = signal<number | null>(null);
    protected readonly destroyRef = inject(DestroyRef);
    private progressDataService = inject(ProgressDataService);

    /**
     * Initializes component and subscribes to progress data updates.
     */
    async ngOnInit(): Promise<void> {
        this.progressDataService
            .getVisualizationData$(this.instanceId())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                this.progressData.set(data);
            });
    }

    /**
     * Toggles selected level for filtering.
     * @param $event - Level index to select or deselect
     */
    protected updateSelectedLevel($event: number) {
        if (this.selectedLevelIndex() === $event) {
            this.selectedLevelIndex.set(null);
        } else {
            this.selectedLevelIndex.set($event);
        }
    }

    /**
     * Builds stepper label with level title and active trainee count.
     * @param level - Level information
     * @returns Formatted label string
     */
    private buildStepperLevelLabel(level: ProgressLevelInfo) {
        const traineeCount = this.progressData().progress.filter((trainee) =>
            trainee.levels.some(
                (lvl) => lvl.id === level.id && lvl.state === 'RUNNING',
            ),
        ).length;
        return level.title + `\n[${traineeCount} active]`;
    }
}
