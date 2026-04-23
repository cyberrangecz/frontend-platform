import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActiveSandboxSummary, AccessedTrainingRun, TrainingTypeEnum } from '@crczp/training-model';
import { SentinelTable, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { Observable, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AccessedTrainingRunTable } from '../model/accessed-training-run-table';
import { AccessedTrainingRunService } from '../services/state/accessed-training-run.service';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { AccessedTrainingRunControls } from '../model/accessed-training-run-controls';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe, NgClass } from '@angular/common';
import { AccessTrainingRunComponent } from './access/access-training-run.component';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { AccessedTrainingRunSort, AdaptiveRunApi, LinearRunApi } from '@crczp/training-api';
import { ActivatedRoute, Router } from '@angular/router';
import { Routing } from '@crczp/routing-commons';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

const ACTIVE_SANDBOXES_REFRESH_MS = 30_000;

/**
 * Main smart component of the trainee overview.
 */
@Component({
    selector: 'crczp-trainee-overview',
    templateUrl: './training-run-overview.component.html',
    styleUrls: ['./training-run-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        NgClass,
        AccessTrainingRunComponent,
        SentinelControlsComponent,
        SentinelTableComponent,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
    ],
    providers: [AccessedTrainingRunService],
})
export class TrainingRunOverviewComponent implements OnInit {
    trainingRuns$: Observable<SentinelTable<AccessedTrainingRun, string>>;
    hasError$: Observable<boolean>;
    isLoading = false;
    controls: SentinelControlItem[];
    readonly activeSandboxes = signal<ActiveSandboxSummary[]>([]);
    /** Allocation unit ids for which cleanup was requested (optimistic); row shows "Removing..." immediately. */
    readonly removingIds = signal<Set<number>>(new Set());
    /** Allocation unit ids we already retriggered cleanup for (max one retry per sandbox). */
    private readonly retriedIds = signal<Set<number>>(new Set());
    /** Message to show on /run when access is blocked or sandbox is allocating. */
    readonly accessMessage = signal<string | null>(null);
    destroyRef = inject(DestroyRef);
    private trainingRunOverviewService = inject(AccessedTrainingRunService);
    private linearRunApi = inject(LinearRunApi);
    private adaptiveRunApi = inject(AdaptiveRunApi);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    private readonly initialRunPagination =
        createPaginationEvent<AccessedTrainingRunSort>({
            sort: 'endTime',
            sortDir: 'desc',
        });

    constructor() {
        const trainingRunOverviewService = this.trainingRunOverviewService;

        this.controls = AccessedTrainingRunControls.create(
            trainingRunOverviewService,
        );

        // If we were redirected here from /run/*/resume, show a reason-specific message.
        const reason = this.route.snapshot.queryParamMap.get('resumeReason');
        if (reason === 'nonManagedNoSandbox') {
            this.accessMessage.set(
                'Please allocate a sandbox using your access code before you can resume this training run.',
            );
        } else if (reason === 'managedNoSandbox') {
            this.accessMessage.set(
                'This is a managed training instance and there is no sandbox available. Please contact your administrator to allocate a sandbox for you.',
            );
        }
    }

    ngOnInit(): void {
        this.initTable();
        this.initActiveSandboxesRefresh();
    }

    private initActiveSandboxesRefresh(): void {
        timer(0, ACTIVE_SANDBOXES_REFRESH_MS)
            .pipe(
                switchMap(() => this.linearRunApi.getUserActiveSandboxes()),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((list) => {
                const prev = this.activeSandboxes().length;
                const nextList = list ?? [];
                const next = nextList.length;
                this.activeSandboxes.set(nextList);
                this.removingIds.update((s) => {
                    if (s.size === 0) return s;
                    const nextSet = new Set(s);
                    for (const id of s) {
                        const sb = nextList.find((x) => x.id === id);
                        if (!sb || sb.cleanupRequest) nextSet.delete(id);
                    }
                    return nextSet;
                });
                if (prev > 0 && next === 0) {
                    this.accessMessage.set(
                        'Sandbox removed. Enter your access code to start a new allocation.',
                    );
                }
                if (next > 0) {
                    this.accessMessage.update((msg) =>
                        msg === 'Sandbox removed. Enter your access code to start a new allocation.'
                            ? null
                            : msg,
                    );
                }
            });
    }

    allocationStagesForDisplay(sb: ActiveSandboxSummary): string[] {
        const raw = sb.allocationRequest?.stages ?? [];
        return raw.map((s) => {
            const u = (s || '').toUpperCase();
            if (u === 'IN_QUEUE' || u === 'QUEUED') return 'In Queue';
            if (u === 'RUNNING') return 'Running';
            if (u === 'FINISHED') return 'Finished';
            if (u === 'FAILED') return 'Failed';
            return s;
        });
    }

    stageIconClass(stage: string): string {
        if (stage === 'Running') return 'incomplete_circle';
        if (stage === 'Finished') return 'check';
        if (stage === 'Failed') return 'close';
        if (stage === 'In Queue') return 'pause';
        return '';
    }

    stageIconName(stage: string): string {
        if (stage === 'Running') return 'incomplete_circle';
        if (stage === 'Finished') return 'check';
        if (stage === 'Failed') return 'close';
        if (stage === 'In Queue') return 'pause';
        return 'incomplete_circle';
    }

    currentStageLabel(sb: ActiveSandboxSummary): string {
        const stages = sb.allocationRequest?.stages ?? [];
        const running = stages.findIndex((s) => s === 'RUNNING' || s === 'IN_QUEUE');
        if (running >= 0) return stages[running];
        const failed = stages.find((s) => s === 'FAILED');
        if (failed) return 'Failed';
        return stages[stages.length - 1] ?? 'In progress';
    }

    /** Cleanup stages for display (when sandbox is being removed). */
    cleanupStagesForDisplay(sb: ActiveSandboxSummary): string[] {
        const raw = sb.cleanupRequest?.stages ?? [];
        return raw.map((s) => {
            const u = (s || '').toUpperCase();
            if (u === 'IN_QUEUE' || u === 'QUEUED') return 'In Queue';
            if (u === 'RUNNING') return 'Running';
            if (u === 'FINISHED') return 'Finished';
            if (u === 'FAILED') return 'Failed';
            return s;
        });
    }

    /** Request cleanup: by sandboxId when present, otherwise by allocation unit id. Shows "Removing..." immediately. If refresh shows cleanup status Failed, retrigger cleanup once (user never sees Failed). */
    removeSandbox(sb: ActiveSandboxSummary): void {
        const id = sb.id;
        this.removingIds.update((s) => {
            const next = new Set(s);
            next.add(id);
            return next;
        });

        const cleanupOnce = (item: ActiveSandboxSummary) =>
            item.sandboxId
                ? this.linearRunApi.requestTraineeSandboxCleanup(item.sandboxId)
                : this.linearRunApi.requestTraineeSandboxCleanupByAllocationId(item.id);

        const clearRemovingId = (targetId: number) => {
            this.removingIds.update((s) => {
                const next = new Set(s);
                next.delete(targetId);
                return next;
            });
        };

        const isCleanupFailed = (item: ActiveSandboxSummary): boolean =>
            (item.cleanupRequest?.stages ?? []).some(
                (s) => (s || '').toUpperCase() === 'FAILED',
            );

        const refreshAfterCleanup = (targetId: number) => {
            this.linearRunApi.getUserActiveSandboxes().subscribe((list) => {
                const nextList = list ?? [];
                const item = nextList.find((x) => x.id === targetId);
                const failed = item && isCleanupFailed(item);
                const alreadyRetried = this.retriedIds().has(targetId);

                if (failed && !alreadyRetried) {
                    this.retriedIds.update((s) => {
                        const next = new Set(s);
                        next.add(targetId);
                        return next;
                    });
                    const listWithoutFailedState = nextList.map((x) =>
                        x.id === targetId && x.cleanupRequest
                            ? { ...x, cleanupRequest: undefined }
                            : x,
                    );
                    this.activeSandboxes.set(listWithoutFailedState);
                    cleanupOnce(item).subscribe({
                        next: () => {
                            this.linearRunApi.getUserActiveSandboxes().subscribe((l) => {
                                this.activeSandboxes.set(l ?? []);
                                clearRemovingId(targetId);
                            });
                        },
                    });
                } else {
                    this.activeSandboxes.set(nextList);
                    clearRemovingId(targetId);
                }
            });
        };

        cleanupOnce(sb).subscribe({
            next: () => refreshAfterCleanup(id),
        });
    }

    /**
     * Calls access API; stays on /run with message when blocked or allocating, navigates only when run is ready.
     */
    access(accessToken: string): void {
        this.accessMessage.set(null);
        this.isLoading = true;
        const isAdaptive = this.isAdaptiveToken(accessToken);
        const api = isAdaptive ? this.adaptiveRunApi : this.linearRunApi;
        api
            .access(accessToken)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (info) => {
                    this.isLoading = false;
                    if (this.canEnterRun(info)) {
                        this.router.navigate([
                            Routing.RouteBuilder.run[isAdaptive ? 'adaptive' : 'linear'].runId(info.trainingRunId!).resume.build(),
                        ]);
                        return;
                    }
                    if (info.allowAllocate === false && (info.activeSandboxes?.length ?? 0) > 0) {
                        if (info.trainingRunId && !info.sandboxInstanceId) {
                            this.accessMessage.set(
                                'Sandbox is being allocated. When ready, enter your access code again to enter the training.',
                            );
                        } else {
                            this.accessMessage.set(
                                'Please remove a sandbox before you can allocate a new training run. Once removed, re-enter your access code to start allocating a new sandbox.',
                            );
                        }
                        this.linearRunApi.getUserActiveSandboxes().subscribe((list) =>
                            this.activeSandboxes.set(list ?? []),
                        );
                    } else if (info.managed && info.allowAllocate === false && !this.canEnterRun(info)) {
                        this.accessMessage.set(
                            'This is a managed training instance and there are no available sandboxes. Please ask your administrator to allocate one before you can access the training.',
                        );
                    }
                },
                error: () => (this.isLoading = false),
            });
    }

    /** True when response has full run content (sandbox ready, level data). */
    private canEnterRun(info: { trainingRunId?: number; sandboxInstanceId?: string; currentLevelId?: number }): boolean {
        return (
            (info.trainingRunId ?? 0) > 0 &&
            !!info.sandboxInstanceId &&
            (info.currentLevelId ?? 0) > 0
        );
    }

    /**
     * Loads training run data for the table component
     */
    loadAccessedTrainingRuns(
        loadEvent: TableLoadEvent<AccessedTrainingRunSort>,
    ): void {
        this.trainingRunOverviewService
            .getAll(
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
                loadEvent.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTable() {
        const initialLoadEvent: TableLoadEvent<AccessedTrainingRunSort> = {
            pagination: this.initialRunPagination,
        };

        this.trainingRuns$ = this.trainingRunOverviewService.resource$.pipe(
            map(
                (resource) =>
                    new AccessedTrainingRunTable(
                        resource,
                        this.trainingRunOverviewService,
                    ),
            ),
        );
        this.hasError$ = this.trainingRunOverviewService.hasError$;
        this.loadAccessedTrainingRuns(initialLoadEvent);
    }

    private isAdaptiveToken(accessToken: string): boolean {
        const re = new RegExp(/^[5-9].+$/);
        return re.test(accessToken.split('-')[1]);
    }
}
