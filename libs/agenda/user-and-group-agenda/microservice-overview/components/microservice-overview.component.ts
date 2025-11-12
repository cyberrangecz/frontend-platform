import { RegisterControlItem } from '@crczp/user-and-group-agenda/internal';
import { MicroserviceTable } from '../model/table/microservice-table';
import { MicroserviceOverviewService } from '../services/microservice-overview.service';
import { Microservice } from '@crczp/user-and-group-model';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
} from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import {
    SentinelTable,
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

@Component({
    selector: 'crczp-microservice-overview',
    templateUrl: './microservice-overview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelTableComponent, SentinelControlsComponent, AsyncPipe],
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
    microservices$: Observable<SentinelTable<Microservice, string>>;
    /**
     * True if error was thrown while getting data for microservies table, false otherwise
     */
    microservicesHasError$: Observable<boolean>;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private microserviceService = inject(MicroserviceOverviewService);
    private paginationService = inject(PaginationStorageService);
    private readonly initPagination =
        this.paginationService.createPagination<MicroserviceSort>(
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );

    ngOnInit(): void {
        const initialLoadEvent: TableLoadEvent<string> = {
            pagination: this.initPagination,
        };
        this.microservices$ = this.microserviceService.resource$.pipe(
            map((microservices) => new MicroserviceTable(microservices)),
        );
        this.microservicesHasError$ = this.microserviceService.hasError$;
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
        this.paginationService.savePageSize(event.pagination.size);
        this.microserviceService
            .getAll(
                event.pagination as OffsetPaginationEvent<MicroserviceSort>,
                event.filter,
            )
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
