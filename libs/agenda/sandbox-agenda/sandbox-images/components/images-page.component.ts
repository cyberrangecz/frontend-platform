import { AsyncPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckbox } from '@angular/material/checkbox';
import { PaginationMapper } from '@crczp/api-common';
import { VmImageSort } from '@crczp/sandbox-api';
import {
    PaginationStorageService,
    providePaginationStorageService,
    SortDir,
} from '@crczp/utils';
import { OffsetPaginationEvent } from '@crczp/utils';
import {
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';
import { SentinelFilterFreeInputComponent } from '@sentinel/components/filters';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { VirtualImagesTable } from '../models/virtual-images-table';
import { VMImagesService } from '../services/v-m-images.service';
import { TableEmptyStateDirective } from '@crczp/components';

@Component({
    selector: 'crczp-images-page',
    templateUrl: './images-page.component.html',
    styleUrls: ['./images-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCheckbox,
        SentinelTableComponent,
        SentinelFilterFreeInputComponent,
        AsyncPipe,
        TableEmptyStateDirective,
    ],
    providers: [
        {
            provide: VMImagesService,
            useClass: VMImagesService,
        },
        providePaginationStorageService(ImagesPageComponent),
    ],
})
export class ImagesPageComponent implements OnInit {
    images$: Observable<VirtualImagesTable> = of();
    imagesTableHasError$: Observable<boolean> = of();
    isLoadingImages$: Observable<boolean> = of();
    guiAccess = false;
    crczpImages = false;
    /**
     * Text the images are currently filtered by
     */
    filter = '';
    destroyRef = inject(DestroyRef);
    readonly DEFAULT_SORT_COLUMN: VmImageSort = 'name';
    readonly DEFAULT_SORT_DIRECTION: SortDir = 'asc';
    private vmImagesService = inject(VMImagesService);
    private paginationService = inject(PaginationStorageService);

    private readonly initialImagesPagination =
        this.paginationService.createPagination<VmImageSort>(
            this.DEFAULT_SORT_COLUMN,
            this.DEFAULT_SORT_DIRECTION,
        );
    private pagination = this.initialImagesPagination;

    constructor() {
        const vmImagesService = this.vmImagesService;

        this.isLoadingImages$ = vmImagesService.isLoading$;
    }

    ngOnInit(): void {
        this.initTable();
    }

    onTableLoadEvent(loadEvent: TableLoadEvent<VmImageSort>): void {
        if (loadEvent.pagination) {
            this.pagination = loadEvent.pagination as OffsetPaginationEvent<VmImageSort>;
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.getAvailableImages(
            PaginationMapper.toOffsetPaginationEvent(this.pagination),
            true,
            this.filter || undefined,
        );
    }

    /**
     * Reloads the images from the first page, filtered by the given text
     * @param filter text to filter images by, empty for no filter
     */
    onFilter(filter: string): void {
        this.filter = filter;
        this.pagination = { ...this.pagination, page: 0 };
        this.getAvailableImages(
            PaginationMapper.toOffsetPaginationEvent(this.pagination),
            true,
            this.filter || undefined,
        );
    }

    osImagesToggled(): void {
        this.crczpImages = !this.crczpImages;
        this.getAvailableImages(
            this.initialImagesPagination,
            true,
            this.filter || undefined,
        );
    }

    guiAccessToggled(): void {
        this.guiAccess = !this.guiAccess;
        this.getAvailableImages(
            this.initialImagesPagination,
            true,
            this.filter || undefined,
        );
    }

    initialTableLoadEvent(loadEvent: TableLoadEvent<VmImageSort>): void {
        if (loadEvent.pagination) {
            this.pagination = loadEvent.pagination as OffsetPaginationEvent<VmImageSort>;
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.getAvailableImages(
            PaginationMapper.toOffsetPaginationEvent(this.pagination),
            false,
        );
    }

    private initTable(): void {
        const initialLoadEvent: TableLoadEvent<VmImageSort> = {
            pagination: this.initialImagesPagination,
        };

        this.images$ = this.vmImagesService.resource$.pipe(
            map((resource) => new VirtualImagesTable(resource)),
        );
        this.imagesTableHasError$ = this.vmImagesService.hasError$;
        this.initialTableLoadEvent(initialLoadEvent);
    }

    private getAvailableImages(
        pagination: OffsetPaginationEvent<VmImageSort>,
        cached: boolean,
        filter?: string,
    ): void {
        this.vmImagesService
            .getAvailableImages(
                pagination,
                this.crczpImages,
                this.guiAccess,
                cached,
                filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }
}
