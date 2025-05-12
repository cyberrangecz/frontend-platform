import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { AnsibleStageAdapter } from '../../../../model/adapters/ansible-stage-adapter';
import { Observable } from 'rxjs';
import { AnsibleOutputsService } from '../../../../services/state/detail/ansible-outputs.service';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-ansible-allocation-stage-detail',
    templateUrl: './ansible-allocation-stage-detail.component.html',
    styleUrls: ['./ansible-allocation-stage-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [AnsibleOutputsService],
})
export class AnsibleAllocationStageDetailComponent implements OnChanges {
    readonly PAGE_SIZE = Number.MAX_SAFE_INTEGER;

    @Input() stage: AnsibleStageAdapter;

    outputs$: Observable<PaginatedResource<string>>;
    isLoading$: Observable<boolean>;
    hasError$: Observable<boolean>;
    hasOutputs$: Observable<boolean>;
    destroyRef = inject(DestroyRef);

    constructor(private outputsService: AnsibleOutputsService) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (this.stage && 'stage' in changes && changes['stage'].isFirstChange()) {
            this.init();
        }
    }

    init(): void {
        const initialPagination = new OffsetPaginationEvent(0, this.PAGE_SIZE, '', 'asc');
        this.onFetch(initialPagination);
        this.outputs$ = this.outputsService.resource$.pipe(takeUntilDestroyed(this.destroyRef));
        this.hasOutputs$ = this.outputs$.pipe(map((outputs) => outputs.elements.length > 0));
        this.isLoading$ = this.outputsService.isLoading$.pipe(takeUntilDestroyed(this.destroyRef));
        this.hasError$ = this.outputsService.hasError$.pipe(takeUntilDestroyed(this.destroyRef));
    }

    onFetch(requestedPagination: OffsetPaginationEvent): void {
        this.outputsService
            .getAll(this.stage, requestedPagination)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }
}
