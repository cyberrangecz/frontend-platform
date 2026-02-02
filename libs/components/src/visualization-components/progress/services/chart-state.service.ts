import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { ProgressLevelInfo } from '@crczp/visualization-model';
import * as echarts from 'echarts';
import { BarBuilder } from '../echarts/chart-elements/progress-chart-bar/bar-builder';
import {
    CombinedProgressChartData,
    SingleBarData,
} from '../echarts/chart-utility-types';
import { Filtering } from '../echarts/data-manipulation/filtering';
import { Mapping, TraineeMappers } from '../echarts/data-manipulation/mapping';
import { Sorting } from '../echarts/data-manipulation/sorting';
import { ProgressChartBuilder } from '../echarts/progress-chart-builder';

/**
 * Core dimensions for bar layout and grid sizing.
 */
const BAR_DIMENSIONS = {
    /** Height of each progress bar (px) */
    height: 24,

    /** Top margin between bars (px) */
    marginTop: 4,

    /** Bottom margin between bars (px) */
    marginBottom: 4,

    /** Max bars shown without vertical scroll */
    maxVisibleEntries: 15,
} as const;

const DEFAULT_CHART_HEIGHT = 624;

/**
 * Total height per bar including margins for grid calculations.
 */
const TOTAL_BAR_HEIGHT =
    BAR_DIMENSIONS.height +
    BAR_DIMENSIONS.marginTop +
    BAR_DIMENSIONS.marginBottom;

@Injectable()
export class ChartStateService implements OnDestroy {
    protected levelDataById: Record<number, ProgressLevelInfo> = {};
    protected previousTraineeCount = 0;
    protected data: CombinedProgressChartData | null = null;
    protected barData: SingleBarData[] | null = null;
    protected chartInstance: echarts.ECharts | null = null;
    protected readonly barBuilder = new BarBuilder(BAR_DIMENSIONS.height);
    protected isDragging = false;
    protected allFinished = false;
    protected updateQueue: (() => void)[] = [];
    private readonly shownTrainees = signal<number>(
        BAR_DIMENSIONS.maxVisibleEntries,
    );
    public readonly chartHeight = computed(
        () =>
            DEFAULT_CHART_HEIGHT -
            (15 - this.shownTrainees()) * (TOTAL_BAR_HEIGHT - 4),
    );

    get chart(): echarts.ECharts {
        if (!this.chartInstance) {
            throw new Error('Chart instance not created yet.');
        }
        return this.chartInstance;
    }

    get initialized(): boolean {
        return (
            this.data !== null &&
            this.barData !== null &&
            this.chartInstance !== null
        );
    }

    /**
     * Checks if all displayed training runs are finished.
     * When all runs are finished, we clamp the timeline to actual data bounds
     * and hide the current time marker.
     * @returns true if all barData entries have state === 'FINISHED'
     */
    public areAllRunsFinished(): boolean {
        if (!this.barData || this.barData.length === 0) {
            return false;
        }
        return this.barData.every((bar) => bar.state === 'FINISHED');
    }

    /**
     * Sets dragging state and queues updates until drag ends.
     * @param dragging - Whether user is currently dragging
     */
    public setDragging(dragging: boolean) {
        this.isDragging = dragging;
        if (!dragging) {
            this.updateQueue.forEach((update) => update());
            this.updateQueue = [];
        }
    }

    ngOnDestroy(): void {
        if (this.chartInstance) {
            this.chartInstance.dispose();
            this.chartInstance = null;
        }
    }

    /**
     * Initializes ECharts instance with initial chart configuration.
     * @param container - DOM element to render chart into
     * @param data - Combined chart data for initial render
     */
    createChartInstance(
        container: HTMLElement,
        data: CombinedProgressChartData,
    ) {
        this.initData(data);
        this.chartInstance = echarts.init(container);

        this.allFinished = this.areAllRunsFinished();
        const option = ProgressChartBuilder.buildFullChart(
            this.data,
            this.barData,
            this.barBuilder,
            2,
            1000,
            this.getShowDate(),
            this.allFinished,
        );
        this.chart.setOption(option);
    }

    /**
     * Handles updates when new API data arrives.
     * @param data - New combined chart data from API
     */
    public updatedNewApiData(data: CombinedProgressChartData) {
        if (this.isDragging) {
            this.updateQueue.push(() => this.updatedNewApiData(data));
            return;
        }
        this.data = data;
        if (Object.keys(this.levelDataById).length === 0) {
            this.levelDataById = TraineeMappers.buildLevelsById(data.levels);
        }
        this.filterData();
        this.sortData();
        this.updateBarData();
        this.updateShownTrainees();

        this.allFinished = this.areAllRunsFinished();
        this.chart.setOption(
            {
                ...ProgressChartBuilder.buildXAxis(
                    this.data,
                    this.barData,
                    this.getShowDate(),
                    this.allFinished,
                ),
                ...ProgressChartBuilder.buildYAxis(this.data),
                ...ProgressChartBuilder.buildLegend(this.data),
                ...this.buildSeries(),
                ...this.getUpdateByTraineeCountOption(),
            },
            { replaceMerge: ['series'] },
        );
    }

    /**
     * Handles updates when interpolated time changes during animation.
     * @param data - Combined chart data with updated time
     */
    public updatedInterpolatedTime(data: CombinedProgressChartData) {
        if (this.allFinished) return;
        if (this.isDragging) {
            this.updateQueue.push(() => this.updatedNewApiData(data));
            return;
        }
        this.copyDataExceptProgress(data);
        this.updateBarData();

        this.chart.setOption(
            {
                ...this.buildGrid(),
                ...this.buildDataZoom(true),
                ...ProgressChartBuilder.buildXAxis(
                    this.data,
                    this.barData,
                    this.getShowDate(),
                    this.allFinished,
                ),
                ...this.buildSeries(),
                ...this.getUpdateByTraineeCountOption(),
            },
            { replaceMerge: ['series'] },
        );
    }

    /**
     * Handles updates when sort criteria or direction changes.
     * @param data - Combined chart data with new sort settings
     */
    public updatedSort(data: CombinedProgressChartData) {
        if (this.isDragging) {
            this.updateQueue.push(() => this.updatedNewApiData(data));
            return;
        }
        this.copyDataExceptProgress(data);
        this.sortData();
        this.updateBarData();
        this.chart.setOption(
            {
                ...ProgressChartBuilder.buildYAxis(this.data),
                ...ProgressChartBuilder.buildSeries(
                    this.data,
                    this.barData,
                    this.barBuilder,
                    !this.allFinished,
                ),
            },
            { replaceMerge: ['series'] },
        );
    }

    /**
     * Handles updates when lag state filter selection changes.
     * @param data - Combined chart data with new filter selection
     */
    public updatedLagStateFilter(data: CombinedProgressChartData) {
        if (this.isDragging) {
            this.updateQueue.push(() => this.updatedNewApiData(data));
            return;
        }
        this.copyData(data);
        this.filterData();
        this.sortData();
        this.updateBarData();
        this.updateShownTrainees();

        this.allFinished = this.areAllRunsFinished();
        this.chart.setOption(
            {
                ...ProgressChartBuilder.buildXAxis(
                    this.data,
                    this.barData,
                    this.getShowDate(),
                    this.allFinished,
                ),
                ...ProgressChartBuilder.buildYAxis(this.data),
                ...ProgressChartBuilder.buildLegend(this.data),
                ...this.buildSeries(),
                ...this.getUpdateByTraineeCountOption(),
            },
            { replaceMerge: ['series'] },
        );
    }

    /**
     * Handles updates when a level is highlighted.
     * @param data - Combined chart data with highlighted level
     */
    public updatedHighlightedLevel(data: CombinedProgressChartData) {
        if (this.isDragging) {
            this.updateQueue.push(() => this.updatedNewApiData(data));
            return;
        }
        this.copyDataExceptProgress(data);
        this.updateBarData();

        this.allFinished = this.areAllRunsFinished();
        this.chart.setOption(
            {
                ...ProgressChartBuilder.buildSeries(
                    this.data,
                    this.barData,
                    this.barBuilder,
                    !this.allFinished,
                ),
                ...this.getUpdateByTraineeCountOption(),
            },
            { replaceMerge: ['series'] },
        );
    }

    /**
     * Handles updates when a level is selected for filtering.
     * @param data - Combined chart data with selected level
     */
    public updatedSelectedLevel(data: CombinedProgressChartData) {
        if (this.isDragging) {
            this.updateQueue.push(() => this.updatedNewApiData(data));
            return;
        }
        this.copyData(data);
        this.filterData();
        this.sortData();
        this.updateBarData();
        this.updateShownTrainees();

        this.allFinished = this.areAllRunsFinished();
        this.chart.setOption(
            {
                ...ProgressChartBuilder.buildXAxis(
                    this.data,
                    this.barData,
                    this.getShowDate(),
                    this.allFinished,
                ),
                ...ProgressChartBuilder.buildYAxis(this.data),
                ...ProgressChartBuilder.buildLegend(this.data),
                ...ProgressChartBuilder.buildSeries(
                    this.data,
                    this.barData,
                    this.barBuilder,
                    !this.allFinished,
                ),
                ...this.getUpdateByTraineeCountOption(),
            },
            { replaceMerge: ['series'] },
        );
    }

    /**
     * Resets chart zoom to show full time range.
     */
    public resetZoom() {
        this.chart.dispatchAction({
            type: 'dataZoom',
            dataZoomIndex: [0, 1],
            start: 0,
            end: 100,
        });
    }

    /**
     * Retrieves trainee data by chart index.
     * @param traineeIndex - Index position in chart
     * @returns Trainee data or null if not found
     */
    getTraineeByChartIndex(traineeIndex: number) {
        return this.data?.progress[traineeIndex] ?? null;
    }

    /**
     * Initializes chart data with filtering, sorting, and bar mapping.
     * @param data - Combined chart data to initialize
     */
    protected initData(data: CombinedProgressChartData) {
        // Cache level info by ID for quick lookup
        this.levelDataById = TraineeMappers.buildLevelsById(data.levels);
        this.data = data;
        this.filterData();
        this.sortData();
        this.updateBarData();
        this.updateShownTrainees();
    }

    /**
     * Copies data while preserving existing progress array.
     * @param data - New combined chart data
     */
    private copyDataExceptProgress(data: CombinedProgressChartData) {
        this.checkInitialized();
        const clone = structuredClone(data);
        this.data = {
            ...clone,
            progress: this.data.progress,
        };
    }

    /**
     * Creates deep copy of combined chart data.
     * @param data - Data to copy
     */
    private copyData(data: CombinedProgressChartData) {
        this.checkInitialized();
        this.data = structuredClone(data);
    }

    /**
     * Returns grid and data zoom options if trainee count changed.
     * @returns Partial ECharts option with updates or empty object
     */
    private getUpdateByTraineeCountOption() {
        this.checkInitialized();
        const traineeCount = this.data!.progress.length;
        if (traineeCount !== this.previousTraineeCount) {
            this.previousTraineeCount = traineeCount;
            return {
                ...this.buildDataZoom(true),
                ...this.buildGrid(),
            };
        }
        return {};
    }

    /**
     * Builds grid configuration based on trainee count.
     * @returns Partial ECharts option with grid settings
     */
    private buildGrid() {
        this.checkInitialized();
        const traineeCount = this.data.progress.length;
        const totalDataHeight = traineeCount * TOTAL_BAR_HEIGHT;
        const maxVisibleHeight =
            BAR_DIMENSIONS.maxVisibleEntries * TOTAL_BAR_HEIGHT;
        const gridHeight = Math.min(totalDataHeight, maxVisibleHeight);
        return ProgressChartBuilder.buildGrid(gridHeight);
    }

    /**
     * Builds data zoom configuration preserving current scroll position.
     * @param preservePosition - Whether to maintain current scroll position
     * @returns Partial ECharts option with data zoom settings
     */
    private buildDataZoom(preservePosition = false) {
        this.checkInitialized();
        const traineeCount = this.data.progress.length;

        let startValue: number | undefined;
        let xStart: number | undefined;
        let xEnd: number | undefined;

        if (preservePosition && this.chartInstance) {
            const option = this.chart.getOption() as any;
            const dataZooms = option.dataZoom || [];

            const verticalZoom = dataZooms.find(
                (dz: any) => dz.yAxisIndex?.[0] === 0 || dz.yAxisIndex === 0,
            );
            if (verticalZoom) {
                startValue = verticalZoom.startValue;
            }

            const horizontalZoom = dataZooms.find(
                (dz: any) => dz.xAxisIndex?.[0] === 0 || dz.xAxisIndex === 0,
            );
            if (horizontalZoom) {
                xStart = horizontalZoom.start;
                xEnd = horizontalZoom.end;
            }
        }

        const zoomOption = ProgressChartBuilder.buildDataZoom(
            this.getShowDate(),
            traineeCount,
            BAR_DIMENSIONS.maxVisibleEntries,
            startValue,
        );

        if (xStart !== undefined && xEnd !== undefined) {
            (zoomOption.dataZoom as any[]).forEach((dz) => {
                if (dz.xAxisIndex === 0 || dz.xAxisIndex?.[0] === 0) {
                    dz.start = xStart;
                    dz.end = xEnd;
                }
            });
        }

        return zoomOption;
    }

    private getShowDate(): boolean {
        this.checkInitialized();
        const startTime = this.data.startTime;
        const endTime =
            TraineeMappers.getTrainingEndTime(
                this.barData,
                this.data.endTime,
            ) ?? this.data.startTime;
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        return (
            startDate.getFullYear() !== endDate.getFullYear() ||
            startDate.getMonth() !== endDate.getMonth() ||
            startDate.getDate() !== endDate.getDate()
        );
    }

    /**
     * Builds all chart series including bars, icons, and markers.
     * @returns Partial ECharts option with series array
     */
    private buildSeries() {
        this.allFinished = this.areAllRunsFinished();
        return ProgressChartBuilder.buildSeries(
            this.data,
            this.barData,
            this.barBuilder,
            !this.allFinished, // Only show time marker if not all finished
        );
    }

    /**
     * Applies lag state and level filters to progress data.
     */
    private filterData() {
        this.data.progress = Filtering.filterByLagState(this.data);
        this.data.progress = Filtering.filterBySelectedLevel(this.data);
    }

    private updateShownTrainees() {
        this.shownTrainees.set(
            Math.min(
                this.data ? this.data.progress.length : 0,
                BAR_DIMENSIONS.maxVisibleEntries,
            ),
        );
    }

    /**
     * Applies sorting to progress data based on current criteria.
     */
    private sortData() {
        this.data = Sorting.sortData(this.data);
    }

    /**
     * Maps filtered and sorted data to bar data array.
     */
    private updateBarData() {
        this.barData = Mapping.extractBarData(this.data, this.levelDataById);
    }

    /**
     * Throws error if chart data is not initialized.
     */
    private checkInitialized() {
        if (!this.data || !this.barData) {
            throw new Error('Chart data not initialized yet.');
        }
    }
}
