import { merge, Observable } from 'rxjs';
import { OffsetPaginatedElementsPollingService } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { RequestStage } from '@crczp/sandbox-model';
import { filter, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { StagesDetailPollRegistry } from 'libs/agenda/sandbox-agenda/request-detail/src/services/state/detail/stages-detail-poll-registry.service';

export abstract class StageDetailService extends OffsetPaginatedElementsPollingService<string> {
    private lastStage: RequestStage;

    protected constructor(
        protected pollRegistry: StagesDetailPollRegistry,
        pageSize: number,
        pollingPeriod: number,
    ) {
        super(pageSize, pollingPeriod);
        this.resource$ = merge(this.resourceSubject$.asObservable(), this.createStoppablePoll(pollingPeriod));
    }

    getAll(stage: RequestStage, requestedPagination: OffsetPaginationEvent): Observable<PaginatedResource<string>> {
        this.onManualResourceRefresh(requestedPagination, stage);
        return this.callApiToGetStageDetail(stage, requestedPagination).pipe(
            tap(
                (resource) => this.resourceSubject$.next(resource),
                () => this.onGetAllError(),
            ),
        );
    }

    protected createStoppablePoll(pollingPeriod: number): Observable<PaginatedResource<string>> {
        const shouldBePolled$ = this.pollRegistry.polledStageIds$.pipe(
            map((polledIds) => polledIds.includes(this.lastStage.id)),
        );
        return shouldBePolled$.pipe(
            filter((shouldBePolled) => shouldBePolled),
            switchMap(() => this.refreshResource()),
            shareReplay(Number.POSITIVE_INFINITY, pollingPeriod),
        );
    }

    protected onManualResourceRefresh(pagination: OffsetPaginationEvent, ...params: any[]): void {
        super.onManualResourceRefresh(pagination, ...params);
        this.lastStage = params[0];
    }

    protected refreshResource(): Observable<PaginatedResource<string>> {
        this.hasErrorSubject$.next(false);
        return this.callApiToGetStageDetail(this.lastStage, this.lastPagination).pipe(
            tap({ error: () => this.onGetAllError() }),
        );
    }

    protected onGetAllError(): void {
        this.hasErrorSubject$.next(true);
    }

    protected abstract callApiToGetStageDetail(
        stage: RequestStage,
        requestedPagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<string>>;
}
