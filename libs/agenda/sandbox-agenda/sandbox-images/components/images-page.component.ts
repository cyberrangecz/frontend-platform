import { map } from 'rxjs/operators';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
} from '@angular/core';
import { Observable } from 'rxjs';
import {
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';
import { VirtualImagesTable } from '../models/virtual-images-table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VMImagesService } from '../services/v-m-images.service';
import { MatCheckbox } from '@angular/material/checkbox';
import { AsyncPipe } from '@angular/common';
import {
    PaginationStorageService,
    providePaginationStorageService,
} from '@crczp/utils';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { VmImageSort } from '@crczp/sandbox-api';

@Component({
    selector: 'crczp-images-page',
    templateUrl: './images-page.component.html',
    styleUrls: ['./images-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatCheckbox, SentinelTableComponent, AsyncPipe],
    providers: [
        {
            provide: VMImagesService,
            useClass: VMImagesService,
        },
        providePaginationStorageService(ImagesPageComponent),
    ],
})
export class ImagesPageComponent implements OnInit {
    images$: Observable<VirtualImagesTable>;
    imagesTableHasError$: Observable<boolean>;
    isLoadingImages$: Observable<boolean>;
    guiAccess = false;
    crczpImages = false;
    destroyRef = inject(DestroyRef);
    readonly DEFAULT_SORT_COLUMN = 'name';
    readonly DEFAULT_SORT_DIRECTION = 'asc';
    private vmImagesService = inject(VMImagesService);
    private paginationService = inject(PaginationStorageService);
    private lastFilter: string;

    private readonly initialImagesPagination =
        createPaginationEvent<VmImageSort>({
            sort: this.DEFAULT_SORT_COLUMN,
        });

    constructor() {
        const vmImagesService = this.vmImagesService;

        this.isLoadingImages$ = vmImagesService.isLoading$;
    }

    ngOnInit(): void {
        this.initTable();
    }

    onTableLoadEvent(loadEvent: TableLoadEvent<VmImageSort>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.lastFilter = loadEvent.filter;
        this.getAvailableImages(
            PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
            true,
            loadEvent.filter,
        );
    }

    osImagesToggled(): void {
        this.crczpImages = !this.crczpImages;
        this.getAvailableImages(
            this.initialImagesPagination,
            true,
            this.lastFilter,
        );
    }

    guiAccessToggled(): void {
        this.guiAccess = !this.guiAccess;
        this.getAvailableImages(
            this.initialImagesPagination,
            true,
            this.lastFilter,
        );
    }

    initialTableLoadEvent(loadEvent: TableLoadEvent<VmImageSort>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.getAvailableImages(
            PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
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
