import {
    AfterViewInit,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    model,
    OnDestroy,
    signal,
    untracked,
    viewChild,
    WritableSignal,
} from '@angular/core';
import { ProgressVisualizationApiData } from '@crczp/visualization-model';
import { TimeInterpolationService } from '../../services/time-interpolation.service';
import { MatButton, MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SentinelEnumerationSelectComponent } from '@sentinel/components/enumeration-select';
import { SentinelButtonWithIconComponent } from '@sentinel/components/button-with-icon';
import {
    CombinedProgressChartData,
    LagState,
    SortCriteria,
} from '../../echarts/chart-utility-types';
import { LagStateUtils } from '../../echarts/data-manipulation/lag-state';
import { ChartStateService } from '../../services/chart-state.service';
import { TimeRangeOption } from '../time-range-selector/time-range-selector';
import { MatTooltip } from '@angular/material/tooltip';
import { A } from '@angular/cdk/keycodes';

/**
 * Time padding in milliseconds added to chart boundaries.
 */
export const TIME_PADDING_MS = 5 * 60 * 1000;

@Component({
    selector: 'crczp-progress-chart',
    imports: [
        MatButton,
        MatIcon,
        SentinelEnumerationSelectComponent,
        SentinelButtonWithIconComponent,
        MatMiniFabButton,
        MatTooltip,
    ],
    providers: [TimeInterpolationService, ChartStateService],
    templateUrl: './progress-chart.component.html',
    styleUrl: './progress-chart.component.scss',
})
export class ProgressChartComponent implements AfterViewInit, OnDestroy {
    visualizationData = input.required<ProgressVisualizationApiData>();
    combinedData = computed<CombinedProgressChartData>(() => {
        return this.buildData();
    });
    highlightedLevel = input<number | null>(null);
    selectedLevel = input<number | null>(null);

    protected readonly TIME_PADDING = TIME_PADDING_MS;

    protected readonly favoriteTrainees = signal<Set<number>>(new Set());

    protected sortOptions: SortCriteria[] = [
        'TRAINEE_NAME',
        'CURRENT_LEVEL_ORDER',
        'CURRENT_SCORE',
        'LAG_TIME',
        'LAG_PERCENTAGE',
        'TRAINING_RUN_START',
    ];

    protected selectedSort: WritableSignal<SortCriteria> =
        signal<SortCriteria>('TRAINEE_NAME');

    protected readonly sortDirection = signal<'asc' | 'desc'>('asc');

    protected readonly isZoomedIn = signal<boolean>(false);

    protected readonly selectedLagStates = signal<Set<LagState>>(
        new Set(['OK', 'WARNING', 'LATE', 'ABANDONED', 'UNKNOWN']),
    );

    protected readonly chartStateService = inject(ChartStateService);
    protected currentTimeRangeIndex = model(0);
    protected selectedTimeRangeOption = model<TimeRangeOption>('UNLIMITED');

    protected readonly timeService = inject(TimeInterpolationService);
    protected readonly A = A;

    private readonly chartContainer =
        viewChild.required<ElementRef>('chartContainer');

    constructor() {
        this.setupChartUpdateEffects();
    }

    ngAfterViewInit(): void {
        this.chartStateService.createChartInstance(
            this.chartContainer().nativeElement,
            this.combinedData(),
        );

        this.setupClickHandler();
        this.setupLegendSelectHandler();
        this.setupDataZoomListeners();

        window.addEventListener('resize', this.onResize);
    }

    ngOnDestroy(): void {
        if (this.chartClickHandler) {
            this.chartStateService.chart?.off('click', this.chartClickHandler);
        }
        window.removeEventListener('resize', this.onResize);
    }

    /**
     * Clears all favorited trainees.
     */
    clearSelected(): void {
        this.favoriteTrainees.set(new Set());
    }

    /**
     * Sets up reactive effects for chart updates on state changes.
     */
    private setupChartUpdateEffects(): void {
        // Sort effect
        effect(() => {
            const _favorites = this.favoriteTrainees();
            const _sort = this.selectedSort();
            const _direction = this.sortDirection();
            if (!this.chartStateService.initialized) return;
            untracked(() =>
                this.chartStateService.updatedSort(this.buildData()),
            );
        });
        // Highlighted level effect
        effect(() => {
            const _highlighted = this.highlightedLevel();
            if (!this.chartStateService.initialized) return;
            untracked(() =>
                this.chartStateService.updatedHighlightedLevel(
                    this.buildData(),
                ),
            );
        });
        // Selected level effect
        effect(() => {
            const _selected = this.selectedLevel();
            if (!this.chartStateService.initialized) return;
            untracked(() =>
                this.chartStateService.updatedSelectedLevel(this.buildData()),
            );
        });
        // Interpolated time effect
        effect(() => {
            const _time = this.timeService.interpolatedTime();
            if (!this.chartStateService.initialized) return;
            untracked(() =>
                this.chartStateService.updatedInterpolatedTime(
                    this.buildData(),
                ),
            );
        });
        // Lag state selection effect
        effect(() => {
            const _lagStates = this.selectedLagStates();
            if (!this.chartStateService.initialized) return;
            untracked(() =>
                this.chartStateService.updatedLagStateFilter(this.buildData()),
            );
        });
        // Api data effect
        effect(() => {
            const _apiData = this.visualizationData();
            if (!this.chartStateService.initialized) return;
            untracked(() =>
                this.chartStateService.updatedNewApiData(this.buildData()),
            );
        });
    }

    /**
     * Handles chart click events for toggling trainee favorites.
     * @param params - ECharts click event parameters
     */
    private chartClickHandler(params: unknown): void {
        const p = params as {
            componentType: string;
            value: number;
            dataIndex?: number;
        };

        if (p.componentType === 'yAxis') {
            const traineeIndex =
                p.dataIndex !== undefined ? p.dataIndex : Math.round(p.value);

            const trainee =
                this.chartStateService.getTraineeByChartIndex(traineeIndex);

            if (trainee) {
                this.favoriteTrainees.update((set) => {
                    const newSet = new Set(set);
                    if (newSet.has(trainee.id)) {
                        newSet.delete(trainee.id);
                    } else {
                        newSet.add(trainee.id);
                    }
                    return newSet;
                });
            }
        }
    }

    /**
     * Registers click event handler on chart.
     */
    private setupClickHandler(): void {
        this.chartStateService.chart.on(
            'click',
            this.chartClickHandler.bind(this),
        );
    }

    /**
     * Registers legend selection change handler for lag state filtering.
     */
    private setupLegendSelectHandler(): void {
        this.chartStateService.chart.on(
            'legendselectchanged',
            (params: unknown) => {
                const p = params as {
                    name: string;
                    selected: Record<string, boolean>;
                };

                const newSelectedStates = new Set<LagState>();

                Object.entries(p.selected).forEach(([name, isSelected]) => {
                    if (isSelected) {
                        const lagState = LagStateUtils.LABEL_TO_STATE[name];
                        if (lagState) {
                            newSelectedStates.add(lagState);
                        }
                    }
                });

                this.selectedLagStates.set(newSelectedStates);
            },
        );
    }

    /**
     * Sets up listeners for drag detection and zoom state tracking.
     */
    private setupDataZoomListeners(): void {
        const zr = this.chartStateService.chart.getZr(); // ZRender instance (low-level canvas events)

        // Detect drag start (mousedown anywhere on chart)
        zr.on('mousedown', (_event) => {
            this.chartStateService.setDragging(true);
        });

        // Detect drag end (mouseup with 50ms debounce for click detection)
        zr.on('mouseup', () => {
            setTimeout(() => {
                this.chartStateService.setDragging(false);
            }, 50);
        });

        // Reset drag if mouse leaves chart area
        zr.on('mouseout', () => {
            this.chartStateService.setDragging(false);
        });

        // Track zoom state changes (dataZoom events)
        this.chartStateService.chart.off('dataZoom'); // Remove previous listeners
        this.chartStateService.chart.on(
            'dataZoom',
            (event: { start: number; end: number }) => {
                // Ignore batch events and invalid events
                if (
                    'batch' in event ||
                    event.start === undefined ||
                    event.end === undefined
                ) {
                    return;
                }

                // Zoomed in if not full range (0-100%)
                this.isZoomedIn.set(!(event.start === 0 && event.end === 100));
            },
        );
    }

    /**
     * Handles window resize events to resize chart.
     */
    private onResize = (): void => {
        this.chartStateService.chart.resize();
    };

    /**
     * Combines API data with UI state for chart rendering.
     * @returns Complete chart data structure
     */
    private buildData(): CombinedProgressChartData {
        return {
            ...this.visualizationData(),
            // Apply selected level filter first (reduces data size early)
            // Use selectedLevel as highlight if no explicit highlight
            highlightedLevelIndex:
                this.selectedLevel() !== null
                    ? this.selectedLevel()
                    : this.highlightedLevel(),
            currentlySolvedLevelFilter: this.selectedLevel(),
            favoritedTrainees: this.favoriteTrainees(),
            sortCriteria: this.selectedSort(),
            sortDirection: this.sortDirection(),
            selectedLagStates: this.selectedLagStates(),
            startTime: this.visualizationData().startTime,
            endTime: this.timeService.interpolatedTime(),
        };
    }
}
