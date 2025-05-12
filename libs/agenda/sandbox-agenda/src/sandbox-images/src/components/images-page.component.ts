import { map } from 'rxjs/operators';
import { VirtualImage } from '@crczp/sandbox-model';
import { OffsetPaginationEvent, PaginationBaseEvent } from '@sentinel/common/pagination';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { SentinelTable, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { VirtualImagesTable } from '../models/virtual-images-table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckbox } from '@angular/material/checkbox';
import { AsyncPipe } from '@angular/common';
import { VMImagesService } from '../services/vm-images.service';
import { DefaultPaginationService } from '@crczp/components-common';

@Component({
    selector: 'crczp-images-page',
    templateUrl: './images-page.component.html',
    styleUrls: ['./images-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelTableComponent,
        MatCheckbox,
        AsyncPipe
    ]
})
export class ImagesPageComponent implements OnInit {
    constructor(
        private vmImagesService: VMImagesService,
        private paginationService: DefaultPaginationService,
    ) {
        this.isLoadingImages$ = vmImagesService.isLoading$;
    }

    @Input() paginationId = 'crczp-resources-page';
    images$: Observable<SentinelTable<VirtualImage>>;
    imagesTableHasError$: Observable<boolean>;
    isLoadingImages$: Observable<boolean>;
    guiAccess = false;
    crczpImages = false;
    destroyRef = inject(DestroyRef);
    readonly DEFAULT_SORT_COLUMN = 'name';
    readonly DEFAULT_SORT_DIRECTION = 'asc';
    private lastFilter: string;

    ngOnInit(): void {
        this.initTable();
    }

    onTableLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.setPagination(ImagesPageComponent, loadEvent.pagination.size);
        this.lastFilter = loadEvent.filter;
        this.getAvailableImages(loadEvent.pagination, true, loadEvent.filter);
    }

    osImagesToggled(): void {
        this.crczpImages = !this.crczpImages;
        this.getAvailableImages(this.getInitialPaginationEvent(), true, this.lastFilter);
    }

    guiAccessToggled(): void {
        this.guiAccess = !this.guiAccess;
        this.getAvailableImages(this.getInitialPaginationEvent(), true, this.lastFilter);
    }

    initialTableLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.setPagination(this.paginationId, loadEvent.pagination.size);
        this.getAvailableImages(loadEvent.pagination, false);
    }

    private initTable(): void {
        const initialLoadEvent: TableLoadEvent = {
            pagination: this.getInitialPaginationEvent(),
        };

        this.images$ = this.vmImagesService.resource$.pipe(map((resource) => new VirtualImagesTable(resource)));
        this.imagesTableHasError$ = this.vmImagesService.hasError$;
        this.initialTableLoadEvent(initialLoadEvent);
    }

    private getAvailableImages(pagination: PaginationBaseEvent, cached: boolean, filter?: string): void {
        this.vmImagesService
            .getAvailableImages(pagination, this.crczpImages, this.guiAccess, cached, filter)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private getInitialPaginationEvent(): OffsetPaginationEvent {
        return new OffsetPaginationEvent(
            0,
            this.paginationService.getPagination(this.paginationId),
            this.DEFAULT_SORT_COLUMN,
            this.DEFAULT_SORT_DIRECTION,
        );
    }
}
