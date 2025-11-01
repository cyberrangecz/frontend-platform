import { ActivatedRoute } from '@angular/router';
import { Request, RequestStage, RequestStageTypeMapper } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { RequestStagesService } from '../../services/state/request-stages.service';
import { StageAdapter } from '../../model/adapters/stage-adapter';
import { StagesDetailPollRegistry } from '../../services/state/detail/stages-detail-poll-registry.service';
import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

/**
 * Smart component for pool request detail page
 */
export abstract class RequestDetailComponent {
    stages$: Observable<StageAdapter[]>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;

    destroyRef = inject(DestroyRef);
    protected readonly window = window;
    private readonly STAGE_COUNT = 3;
    private request: Request;
    private activatedRoute = inject(ActivatedRoute);
    protected fragmentIndex = toSignal(
        this.activatedRoute.fragment.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((fragment) => this.mapFragmentToIndex(fragment)),
        ),
    );

    private currentRunningStageIndex = signal(0);
    private requestStagesService = inject(RequestStagesService);
    private stageDetailRegistry = inject(StagesDetailPollRegistry);

    protected constructor() {
        this.init();
        this.setupKeyboardNavigation();
    }

    /**
     * Helper method to improve performance of *ngFor directive
     * @param item selected stage
     */
    trackByFn(item: RequestStage): number {
        return item.id;
    }

    /**
     * Navigate to a specific stage by updating the URL fragment
     * @param stageIndex index of the stage to navigate to
     */
    navigateToStage(stageIndex: number): void {
        // JS modulo breaks on negative numbers, so we adjust it
        const moduloIndex =
            ((stageIndex % this.STAGE_COUNT) + this.STAGE_COUNT) %
            this.STAGE_COUNT;
        const fragment = `stage-${moduloIndex + 1}`;
        if (this.fragmentIndex() !== moduloIndex) {
            this.window.location.hash = fragment;
        }
    }

    /**
     * Reloads stages of pool request
     */
    reloadStages(): void {
        if (this.request) {
            this.requestStagesService
                .getAll(this.request)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe();
        }
    }

    /**
     * Get the carousel order based on the current fragment index
     * Returns array of 3 stage indices in the pattern:
     * - index 0 => [2, 0, 1] (stages 3-1-2)
     * - index 1 => [0, 1, 2] (stages 1-2-3)
     * - index 2 => [1, 2, 0] (stages 2-3-1)
     */
    getCarouselOrder(): number[] {
        const currentIndex = this.fragmentIndex() ?? 0;
        const totalStages = this.STAGE_COUNT;
        return [
            (currentIndex - 1 + totalStages) % totalStages,
            currentIndex % totalStages,
            (currentIndex + 1) % totalStages,
        ];
    }

    /**
     * Handle carousel item clicks for navigation
     * @param position position in the carousel (0 = left, 1 = center, 2 = right)
     */
    onCarouselItemClick(position: number): void {
        if (position === 1) return; // Center item is already selected

        const carouselOrder = this.getCarouselOrder();
        this.navigateToStage(carouselOrder[position]);
    }

    /**
     * Determine if a carousel item should be visible based on its logical ordering
     * @param positionInView position in carousel (0 = left, 1 = center, 2 = right)
     * @param stageIndex the actual stage index being displayed
     */
    isCarouselItemVisible(positionInView: number, stageIndex: number): boolean {
        const currentIndex = this.fragmentIndex() ?? 0;
        // Center is always visible
        if (positionInView === 1) {
            return true;
        }
        // Left position: should only be visible if stageIndex < currentIndex
        if (positionInView === 0) {
            return stageIndex < currentIndex;
        }
        // Right position: should only be visible if stageIndex > currentIndex
        if (positionInView === 2) {
            return stageIndex > currentIndex;
        }
        return false;
    }

    /**
     * Setup keyboard navigation for arrow keys and tab
     */
    private setupKeyboardNavigation(): void {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Tab') {
                event.preventDefault();
                event.stopPropagation();
                this.navigateToStage((this.fragmentIndex() ?? 0) + 1);
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        this.destroyRef.onDestroy(() => {
            document.removeEventListener('keydown', handleKeyDown);
        });
    }

    private init() {
        this.activatedRoute.data
            .pipe(
                tap((data) => {
                    this.request = data[Request.name];
                }),
                switchMap((data) =>
                    this.requestStagesService.getAll(data[Request.name]),
                ),
                tap((stages) => {
                    console.log('Stages', stages);
                    const running = stages.find((stage) => stage.isRunning());
                    if (running) {
                        RequestStageTypeMapper.toOrderOfExecution(running.type);
                    }
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() =>
                this.requestStagesService.startPolling(this.request),
            );

        this.stages$ = this.requestStagesService.stages$.pipe(
            takeUntilDestroyed(this.destroyRef),
            tap((stages) => this.updateLastCurrentStageIndex(stages)),
        );

        this.hasError$ = this.requestStagesService.hasError$;
        this.isLoading$ = this.requestStagesService.isLoading$;
    }

    private mapFragmentToIndex(fragment: string | null): number {
        if (fragment) {
            const match = fragment.match(/^stage-(\d+)$/);
            if (match) {
                return parseInt(match[1], 10) - 1;
            } else {
                return 0;
            }
        }
    }

    private updateLastCurrentStageIndex(stages: StageAdapter[]) {
        this.currentRunningStageIndex.set(
            stages.findIndex(
                (stage) => !stage.hasFinished() && !stage.hasFailed(),
            ) + 1 || stages.length,
        );
    }
}
