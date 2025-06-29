import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { TerraformStageAdapter } from 'libs/agenda/sandbox-agenda/request-detail/src/model/adapters/terraform-stage-adapter';
import { Observable } from 'rxjs';
import { TerraformOutputsService } from 'libs/agenda/sandbox-agenda/request-detail/src/services/state/detail/terraform-outputs.service';
import { CloudResourcesService } from 'libs/agenda/sandbox-agenda/request-detail/src/services/state/detail/cloud-resources.service';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-terraform-allocation-stage-detail',
    templateUrl: './terraform-allocation-stage-detail.component.html',
    styleUrls: ['./terraform-allocation-stage-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [TerraformOutputsService, CloudResourcesService],
})
export class TerraformAllocationStageDetailComponent implements OnChanges {
    readonly PAGE_SIZE = Number.MAX_SAFE_INTEGER;

    @Input() stage: TerraformStageAdapter;
    outputs$: Observable<PaginatedResource<string>>;
    hasOutputs$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    hasError$: Observable<boolean>;
    destroyRef = inject(DestroyRef);

    constructor(
        private outputsService: TerraformOutputsService,
        private resourcesService: CloudResourcesService,
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (this.stage && 'stage' in changes && changes['stage'].isFirstChange()) {
            this.init();
        }
    }

    init(): void {
        const initialPagination = new OffsetPaginationEvent(0, this.PAGE_SIZE, '', 'asc');
        this.onFetchEvents(initialPagination);

        this.outputs$ = this.outputsService.resource$.pipe(takeUntilDestroyed(this.destroyRef));
        this.hasOutputs$ = this.outputs$.pipe(map((events) => events.elements.length > 0));
        this.isLoading$ = this.outputsService.isLoading$.pipe(takeUntilDestroyed(this.destroyRef));
        this.hasError$ = this.outputsService.hasError$.pipe(takeUntilDestroyed(this.destroyRef));
    }

    onFetchEvents(requestedPagination: OffsetPaginationEvent): void {
        this.outputsService
            .getAll(this.stage, requestedPagination)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }
}
