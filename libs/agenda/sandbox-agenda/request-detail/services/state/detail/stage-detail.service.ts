import { merge, Observable, takeUntil } from 'rxjs';
import { OffsetPaginatedElementsPollingService } from '@sentinel/common';
import {
    OffsetPaginationEvent,
    PaginatedResource,
} from '@sentinel/common/pagination';
import { RequestStage } from '@crczp/sandbox-model';
import { filter, tap } from 'rxjs/operators';
import { StagesDetailPollRegistry } from './stages-detail-poll-registry.service';

export abstract class StageDetailService extends OffsetPaginatedElementsPollingService<string> {
    private lastStage: RequestStage;

    protected constructor(
        protected pollRegistry: StagesDetailPollRegistry,
        pageSize: number,
        pollingPeriod: number,
    ) {
        super(pageSize, pollingPeriod);
        this.resource$ = merge(
            this.resourceSubject$.asObservable(),
            this.pollUntilFound(),
        );
    }

    getAll(
        stage: RequestStage,
        requestedPagination: OffsetPaginationEvent<string>,
    ): Observable<PaginatedResource<string>> {
        this.onManualResourceRefresh(requestedPagination, stage);
        return this.callApiToGetStageDetail(stage, requestedPagination).pipe(
            tap(
                (resource) => this.resourceSubject$.next(resource),
                () => this.onGetAllError(),
            ),
        );
    }

    protected pollUntilFound(): Observable<PaginatedResource<string>> {
        const shouldBePolled$ = this.pollRegistry.polledStageIds$.pipe(
            filter((polledIds) => polledIds.includes(this.lastStage.id)),
        );
        return super.createPoll().pipe(takeUntil(shouldBePolled$));
    }

    protected onManualResourceRefresh(
        pagination: OffsetPaginationEvent<string>,
        ...params: any[]
    ): void {
        super.onManualResourceRefresh(pagination, ...params);
        this.lastStage = params[0];
    }

    protected refreshResource(): Observable<PaginatedResource<string>> {
        this.hasErrorSubject$.next(false);
        return this.callApiToGetStageDetail(
            this.lastStage,
            this.lastPagination,
        ).pipe(tap({ error: () => this.onGetAllError() }));
    }

    protected onGetAllError(): void {
        this.hasErrorSubject$.next(true);
    }

    protected abstract callApiToGetStageDetail(
        stage: RequestStage,
        requestedPagination: OffsetPaginationEvent<string>,
    ): Observable<PaginatedResource<string>>;
}
