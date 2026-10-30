import { ActivatedRoute, Router } from '@angular/router';
import { Request, RequestStage, RequestStageTypeMapper } from '@crczp/sandbox-model';
import { fromEvent, Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { RequestStagesService } from '../services/state/request-stages.service';
import { StageAdapter } from '../model/adapters/stage-adapter';
import {
    afterNextRender,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    Injector,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';

/**
 * Smart component for pool request detail page
 */
export abstract class RequestDetailComponent {
    stages$: Observable<StageAdapter[]>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;

    destroyRef = inject(DestroyRef);
    private readonly router = inject(Router);
    private readonly STAGE_COUNT = 3;
    private static readonly KEYBOARD_EXCLUDED_SELECTOR =
        '.cm-editor, input, textarea, select, [contenteditable]:not([contenteditable="false"]), crczp-log-view-settings-panel';
    private readonly document = inject(DOCUMENT);
    private request: Request;
    private activatedRoute = inject(ActivatedRoute);
    private autoNavigated = false;
    private hasScrolledToStageView = false;
    private hasFocusedStage = false;
    private isStageChangedByPolling = false;
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    private stageFragmentIndex = toSignal(
        this.activatedRoute.fragment.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((fragment) => this.parseStageIndex(fragment)),
        ),
    );
    protected fragmentIndex = computed(() => this.stageFragmentIndex() ?? 0);
    private requestStagesService = inject(RequestStagesService);
    private previousStages: StageAdapter[] = [];

    protected constructor() {
        this.init();
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
            void this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParamsHandling: 'preserve',
                fragment,
            });
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
        const currentIndex = this.fragmentIndex();
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
     * Carousel position of a stage relative to the current one
     * @param stageIndex index of the stage
     * @returns 0 = left, 1 = center, 2 = right
     */
    getCarouselPosition(stageIndex: number): number {
        return (
            (stageIndex - this.fragmentIndex() + this.STAGE_COUNT + 1) %
            this.STAGE_COUNT
        );
    }

    /** Names a stage for assistive technology by its order among the stages and its title. */
    describeStage(stage: StageAdapter, stageIndex: number, stageCount: number): string {
        return `Stage ${stageIndex + 1} of ${stageCount}: ${stage.title}`;
    }

    /**
     * Determine if a carousel item should be visible based on its logical ordering
     * @param positionInView position in carousel (0 = left, 1 = center, 2 = right)
     * @param stageIndex the actual stage index being displayed
     */
    isCarouselItemVisible(positionInView: number, stageIndex: number): boolean {
        const currentIndex = this.fragmentIndex();
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

    private init() {
        fromEvent<KeyboardEvent>(this.document, 'keydown')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((event) => this.navigateByArrowKey(event));

        effect(() => {
            this.fragmentIndex();
            untracked(() => this.focusCentredStageAfterChange());
        });

        this.activatedRoute.data
            .pipe(
                tap((data) => (this.request = data[Request.name])),
                switchMap((data) =>
                    this.requestStagesService.getAll(data[Request.name]),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() =>
                this.requestStagesService.startPolling(this.request),
            );

        this.stages$ = this.requestStagesService.stages$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((stages) => this.sortByExecutionOrder(stages)),
            tap((stages) => {
                // No fragment was set in route, so we navigate to last running stage for convenience
                if (
                    this.stageFragmentIndex() === undefined &&
                    !this.autoNavigated
                ) {
                    this.updateLastCurrentStageIndex(stages);
                }

                this.scrollToStageViewOnce(stages);
                this.focusCentredStageOnce(stages);
                this.moveToNextStageIfFinished(stages);
                this.previousStages = [...stages];
            }),
            map((stages) => this.mapStagesMetadata(stages)),
        );

        this.hasError$ = this.requestStagesService.hasError$;
        this.isLoading$ = this.requestStagesService.isLoading$;
    }

    /**
     * Moves to the previous or next stage on a plain Left or Right arrow press,
     * wrapping around at either end. Presses inside text-editing elements or with
     * a modifier held are left alone.
     */
    private navigateByArrowKey(event: KeyboardEvent): void {
        const step =
            event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
        if (
            step === 0 ||
            event.defaultPrevented ||
            event.ctrlKey ||
            event.altKey ||
            event.metaKey ||
            event.shiftKey ||
            (event.target instanceof Element &&
                event.target.closest(
                    RequestDetailComponent.KEYBOARD_EXCLUDED_SELECTOR,
                ))
        ) {
            return;
        }
        event.preventDefault();
        this.navigateToStage(this.fragmentIndex() + step);
    }

    /**
     * Once per page load, after the first stages render, scrolls the page so the
     * stage indicator row sits at the top of the screen. The row is a sibling of the
     * carousel, so no carousel ancestor is scrolled.
     */
    private scrollToStageViewOnce(stages: StageAdapter[]): void {
        if (this.hasScrolledToStageView || stages.length === 0) {
            return;
        }
        this.hasScrolledToStageView = true;
        afterNextRender(
            () =>
                this.host.nativeElement
                    .querySelector('.stage-indicators')
                    ?.scrollIntoView({ behavior: 'instant', block: 'start' }),
            { injector: this.injector },
        );
    }

    /** Once per page load, after the first stages render, focuses the centred stage. */
    private focusCentredStageOnce(stages: StageAdapter[]): void {
        if (this.hasFocusedStage || stages.length === 0) {
            return;
        }
        this.hasFocusedStage = true;
        this.focusCentredStage();
    }

    /**
     * Focuses the newly centred stage after the current stage changes, unless polling changed it.
     */
    private focusCentredStageAfterChange(): void {
        if (this.isStageChangedByPolling) {
            this.isStageChangedByPolling = false;
            return;
        }
        this.focusCentredStage();
    }

    /**
     * After the next render, focuses the centred stage without scrolling, provided focus rests on
     * the page body or inside the carousel.
     */
    private focusCentredStage(): void {
        afterNextRender(
            () => {
                const host = this.host.nativeElement;
                const focused = this.document.activeElement;
                const carousel = host.querySelector('.carousel');
                if (focused && focused !== this.document.body && !carousel?.contains(focused)) {
                    return;
                }
                carousel
                    ?.querySelector<HTMLElement>('.carousel-item[data-position="1"]')
                    ?.focus({ preventScroll: true });
            },
            { injector: this.injector },
        );
    }

    /**
     * Reads the stage index a `stage-N` fragment names, clamped to the stages that exist;
     * undefined for any other fragment.
     */
    private parseStageIndex(fragment: string | null): number | undefined {
        const stageNumber = fragment?.match(/^stage-(\d+)$/)?.[1];
        return stageNumber === undefined
            ? undefined
            : Math.min(
                  Math.max(parseInt(stageNumber, 10) - 1, 0),
                  this.STAGE_COUNT - 1,
              );
    }

    private sortByExecutionOrder(stages: StageAdapter[]): StageAdapter[] {
        return [...stages].sort(
            (a, b) =>
                RequestStageTypeMapper.toOrderOfExecution(a.type) -
                RequestStageTypeMapper.toOrderOfExecution(b.type),
        );
    }

    private updateLastCurrentStageIndex(stages: StageAdapter[]) {
        const currentStageIndex = stages.findIndex(
            (stage) => !stage.hasFinished() || stage.hasFailed(),
        );
        if (currentStageIndex !== -1) {
            this.autoNavigated = true;
            this.navigateToStage(currentStageIndex);
        }
    }

    /**
     * Navigate to the next stage if the current stage has just finished
     */
    private moveToNextStageIfFinished(stages: StageAdapter[]): void {
        if (this.previousStages.length === 0 || this.fragmentIndex() >= 2) {
            return;
        }
        const currentHasFinished =
            stages[this.fragmentIndex()].hasFinished() &&
            this.previousStages[this.fragmentIndex()].isRunning();

        if (currentHasFinished) {
            this.isStageChangedByPolling = true;
            this.navigateToStage(this.fragmentIndex() + 1);
        }
    }

    private mapStagesMetadata(stages: StageAdapter[]): StageAdapter[] {
        const repoUrl = stages.find((stage) => stage.repoUrl);
        const ansibleRevision = stages.find(
            (stage) => stage.rev && !stage.rev.startsWith('mtu'),
        );
        return stages.map((stage) => {
            if (stage.isAnsibleStage()) {
                stage.rev = ansibleRevision?.rev;
            }
            if (stage.repoUrl) {
                stage.repoUrl = repoUrl?.repoUrl;
            }
            return stage;
        });
    }
}
