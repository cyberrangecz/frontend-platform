import {ActivatedRoute} from '@angular/router';
import {Pool, Request, RequestStage} from '@crczp/sandbox-model';
import {exhaustMap, Observable} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {RequestStagesService} from '../../services/state/request-stages.service';
import {StageAdapter} from '../../model/adapters/stage-adapter';
import {StagesDetailPollRegistry} from '../../services/state/detail/stages-detail-poll-registry.service';
import {DestroyRef, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

/**
 * Smart component for pool request detail page
 */
export abstract class RequestDetailComponent {
    stages$: Observable<StageAdapter[]>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    fragment: string;
    destroyRef = inject(DestroyRef);

    private request: Request;

    protected constructor(
        protected activeRoute: ActivatedRoute,
        protected requestStagesService: RequestStagesService,
        protected stageDetailRegistry?: StagesDetailPollRegistry,
    ) {
        this.activeRoute.fragment.subscribe((fragment) => {
            this.fragment = fragment;
        });
        this.init();
    }

    /**
     * Helper method to improve performance of *ngFor directive
     * @param index index of pool request stage
     * @param item selected stage
     */
    trackByFn(index: number, item: RequestStage): number {
        return item.id;
    }

    /**
     * Reloads stages of pool request
     */
    reloadStages(): void {
        this.stages$ = this.requestStagesService.getAll(this.request);
    }

    onStageDetailPanelChange(
        opened: boolean,
        stage: RequestStage, //, order: number
    ): void {
        if (opened) {
            // TODO scroll to view
            this.stageDetailRegistry.add(stage);
        } else {
            this.stageDetailRegistry.remove(stage);
        }
    }

    private init() {
        this.stages$ = this.requestStagesService.stages$.pipe(
            switchMap((stages) => {
                return this.activeRoute.fragment.pipe(
                    map((fragment) => {
                        stages.map((stage, index) => {
                            stage.isExpanded = fragment === `stage-${index}`;
                        });
                        return stages;
                    }),
                );
            }),
            exhaustMap(() => this.activeRoute.data),
            tap((data) => {
                this.request = data[Pool.name];
            }),
            switchMap((data) => this.requestStagesService.getAll(data[Pool.name])),
            takeUntilDestroyed(this.destroyRef),
        );
        this.hasError$ = this.requestStagesService.hasError$;
        this.isLoading$ = this.requestStagesService.isLoading$;
    }
}
