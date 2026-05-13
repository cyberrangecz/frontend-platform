import { computed, Injectable, Signal, inject, signal } from '@angular/core';
import { TrainingInstance } from '@crczp/training-model';
import { SKELETON_ROW_COUNT } from '../config/skeleton.config';
import { buildSkeletonViewModel } from '../selectors/build-skeleton-view-model';
import { BarRow } from '../types/bar.types';
import { EventRow } from '../types/event.types';
import { InstanceId, LevelId } from '../types/ids.types';
import { LevelInfo } from '../types/bar.types';
import { ViewModel } from '../types/view-model.types';
import { ProgressFeedService } from './progress-feed.interface.service';
import { TimeInterpolationService } from './time-interpolation.service';

/**
 * Component-scoped concrete implementation of {@link ProgressFeedService}.
 *
 * Skeleton-only stage: nothing fetches data. Every source signal sits at
 * its initial empty value and the assembled `viewModel` is always a
 * skeleton produced by {@link buildSkeletonViewModel}.
 *
 * The assembled view-model is anchored to a single `mountNowMs` snapshot
 * captured at {@link bind}. The view-model computed therefore depends on
 * stable inputs only — it emits once and the rendering engine drives all
 * subsequent visual progression via per-frame keyframe interpolation.
 * Time-interpolation remains injected because future live-mode batches
 * read it for lag classification; the skeleton path no longer consumes
 * it.
 */
@Injectable()
export class ProgressFeedServiceImpl extends ProgressFeedService {
    private readonly time = inject(TimeInterpolationService);

    private boundInstanceId: Signal<InstanceId> | null = null;
    private mountNowMs: number | null = null;

    private readonly barsSignal = signal<readonly BarRow[]>([]);
    private readonly eventsSignal = signal<readonly EventRow[]>([]);
    private readonly instanceSignal = signal<TrainingInstance | null>(null);
    private readonly levelsByIdSignal = signal<ReadonlyMap<LevelId, LevelInfo>>(new Map<LevelId, LevelInfo>());
    private readonly levelOrderSignal = signal<readonly LevelId[]>([]);
    private readonly instanceEndMsSignal = signal<number | null>(null);

    readonly bars: Signal<readonly BarRow[]> = this.barsSignal.asReadonly();
    readonly events: Signal<readonly EventRow[]> = this.eventsSignal.asReadonly();
    readonly instance: Signal<TrainingInstance | null> = this.instanceSignal.asReadonly();
    readonly levelsById: Signal<ReadonlyMap<LevelId, LevelInfo>> = this.levelsByIdSignal.asReadonly();
    readonly levelOrder: Signal<readonly LevelId[]> = this.levelOrderSignal.asReadonly();
    readonly instanceEndMs: Signal<number | null> = this.instanceEndMsSignal.asReadonly();

    readonly isLive: Signal<boolean> = computed(() => true);

    readonly viewModel: Signal<ViewModel> = computed(() => {
        const instanceId = this.boundInstanceId;
        const seed = instanceId === null ? 0 : instanceId();
        const mountNowMs = this.mountNowMs ?? this.time.interpolatedTime();
        return buildSkeletonViewModel({
            rowCount: SKELETON_ROW_COUNT,
            seed,
            mountNowMs,
            instance: this.instanceSignal(),
        });
    });

    /**
     * Stores the host's `instanceId` signal and captures the mount-time
     * snapshot used to anchor engine-driven motion. The snapshot is read
     * once from the time-interpolation service at bind time; subsequent
     * ticks do not flow into the view-model.
     *
     * @param instanceId - Host-provided instance identifier signal.
     */
    override bind(instanceId: Signal<InstanceId>): void {
        this.boundInstanceId = instanceId;
        this.mountNowMs = this.time.interpolatedTime();
    }
}
