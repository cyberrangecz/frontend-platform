import { RegisterControlItem } from '@crczp/user-and-group-agenda/internal';
import { MicroserviceTable } from '../model/table/microservice-table';
import { MicroserviceOverviewService } from '../services/microservice-overview.service';
import { Microservice } from '@crczp/user-and-group-model';
import { OffsetPaginationEvent } from '@crczp/utils';
import { SentinelFilterFreeInputComponent } from '@sentinel/components/filters';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
} from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import {
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';
import {
    SentinelControlItem,
    SentinelControlsComponent,
} from '@sentinel/components/controls';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import {
    PaginationStorageService,
    providePaginationStorageService,
} from '@crczp/utils';
import { MicroserviceSort } from '@crczp/user-and-group-api';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';

@Component({
    selector: 'crczp-microservice-overview',
    templateUrl: './microservice-overview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelTableComponent,
        SentinelFilterFreeInputComponent,
        SentinelControlsComponent,
        AsyncPipe,
        TableEmptyStateDirective,
    ],
    providers: [
        providePaginationStorageService(MicroserviceOverviewComponent),
        {
            provide: MicroserviceOverviewService,
            useClass: MicroserviceOverviewService,
        },
    ],
})
export class MicroserviceOverviewComponent implements OnInit {
    readonly INIT_SORT_NAME = 'name';
    readonly INIT_SORT_DIR = 'asc';
    /**
     * Data for microservices table component
     */
    microservices$: Observable<TableModel<Microservice, string>>;
    /**
     * Text the microservices are currently filtered by
     */
    filter = '';
    /**
     * True if error was thrown while getting data for microservies table, false otherwise
     */
    microservicesHasError$: Observable<boolean>;
    /**
     * True while data for microservices table is being fetched, false otherwise
     */
    isLoading$: Observable<boolean>;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private microserviceService = inject(MicroserviceOverviewService);
    private paginationService = inject(PaginationStorageService);
    private readonly initPagination =
        this.paginationService.createPagination<MicroserviceSort>(
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );
    private pagination: OffsetPaginationEvent<MicroserviceSort> =
        this.initPagination;

    ngOnInit(): void {
        const initialLoadEvent: TableLoadEvent<string> = {
            pagination: this.initPagination,
        };
        this.microservices$ = this.microserviceService.resource$.pipe(
            map((microservices) => new MicroserviceTable(microservices)),
        );
        this.microservicesHasError$ = this.microserviceService.hasError$;
        this.isLoading$ = this.microserviceService.isLoading$;
        this.microserviceService.selected$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.initControls());
        this.onTableLoadEvent(initialLoadEvent);
    }

    /**
     * Clears selected microservices and calls service to get new data for microservices table
     * @param event event emitted from table component
     */
    onTableLoadEvent(event: TableLoadEvent<string>): void {
        if (event.pagination) {
            this.pagination =
                event.pagination as OffsetPaginationEvent<MicroserviceSort>;
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.load();
    }

    /**
     * Reloads the microservices from the first page, filtered by the given text
     * @param filter text to filter microservices by, empty for no filter
     */
    onFilter(filter: string): void {
        this.filter = filter;
        this.pagination = { ...this.pagination, page: 0 };
        this.load();
    }

    private load(): void {
        this.microserviceService
            .getAll(this.pagination, this.filter || undefined)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initControls() {
        this.controls = [
            new RegisterControlItem(
                'Register',
                of(false),
                defer(() => this.microserviceService.register()),
            ),
        ];
    }
}
