import {map} from 'rxjs/operators';
import {VirtualImage} from '@crczp/sandbox-model';
import {OffsetPaginationEvent, PaginationBaseEvent,} from '@sentinel/common/pagination';
import {ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit,} from '@angular/core';
import {async, Observable} from 'rxjs';
import {SentinelTable, SentinelTableComponent, TableLoadEvent,} from '@sentinel/components/table';
import {VMImagesService} from '../services/vm-images.service';
import {VirtualImagesTable} from '../models/virtual-images-table';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {PaginationStorageService} from '@crczp/common';
import {VMImagesConcreteService} from '../services/vm-images-concrete.service';
import {MatCheckbox} from '@angular/material/checkbox';
import {AsyncPipe} from '@angular/common';

@Component({
    selector: 'crczp-images-page',
    templateUrl: './images-page.component.html',
    styleUrls: ['./images-page.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatCheckbox, SentinelTableComponent, AsyncPipe],
    providers: [
        {
            provide: VMImagesService,
            useClass: VMImagesConcreteService,
        },
    ],
})
export class ImagesPageComponent implements OnInit {
    @Input() paginationId = 'crczp-resources-page';

    images$: Observable<SentinelTable<VirtualImage>>;
    imagesTableHasError$: Observable<boolean>;
    isLoadingImages$: Observable<boolean>;

    guiAccess = false;
    crczpImages = false;
    destroyRef = inject(DestroyRef);
    readonly DEFAULT_SORT_COLUMN = 'name';
    readonly DEFAULT_SORT_DIRECTION = 'asc';
    protected readonly async = async;
    private lastFilter: string;

    constructor(
        private vmImagesService: VMImagesService,
        private paginationService: PaginationStorageService
    ) {
        this.isLoadingImages$ = vmImagesService.isLoading$;
    }

    ngOnInit(): void {
        this.initTable();
    }

    onTableLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.lastFilter = loadEvent.filter;
        this.getAvailableImages(loadEvent.pagination, true, loadEvent.filter);
    }

    osImagesToggled(): void {
        this.crczpImages = !this.crczpImages;
        this.getAvailableImages(
            this.getInitialPaginationEvent(),
            true,
            this.lastFilter
        );
    }

    guiAccessToggled(): void {
        this.guiAccess = !this.guiAccess;
        this.getAvailableImages(
            this.getInitialPaginationEvent(),
            true,
            this.lastFilter
        );
    }

    initialTableLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.getAvailableImages(loadEvent.pagination, false);
    }

    private initTable(): void {
        const initialLoadEvent: TableLoadEvent = {
            pagination: this.getInitialPaginationEvent(),
        };

        this.images$ = this.vmImagesService.resource$.pipe(
            map((resource) => new VirtualImagesTable(resource))
        );
        this.imagesTableHasError$ = this.vmImagesService.hasError$;
        this.initialTableLoadEvent(initialLoadEvent);
    }

    private getAvailableImages(
        pagination: PaginationBaseEvent,
        cached: boolean,
        filter?: string
    ): void {
        this.vmImagesService
            .getAvailableImages(
                pagination,
                this.crczpImages,
                this.guiAccess,
                cached,
                filter
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private getInitialPaginationEvent(): OffsetPaginationEvent {
        return new OffsetPaginationEvent(
            0,
            this.paginationService.loadPageSize()
        );
    }
}
