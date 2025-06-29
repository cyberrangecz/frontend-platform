import {DefaultPaginationService, RegisterControlItem} from '@crczp/user-and-group-agenda/internal';
import {MicroserviceTable} from '../model/table/microservice-table';
import {MicroserviceOverviewService} from '../services/microservice-overview.service';
import {Microservice} from '@crczp/user-and-group-model';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {async, defer, Observable, of} from 'rxjs';
import {SentinelTable, SentinelTableComponent, TableActionEvent, TableLoadEvent} from '@sentinel/components/table';
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from '@sentinel/components/controls';
import {map, take} from 'rxjs/operators';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {UserAndGroupDefaultNavigator, UserAndGroupNavigator} from '@crczp/user-and-group-agenda';
import {AsyncPipe} from '@angular/common';
import {PaginationStorageService} from "@crczp/components-common";

@Component({
    selector: 'crczp-microservice-overview',
    templateUrl: './microservice-overview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelTableComponent,
        SentinelControlsComponent,
        AsyncPipe
    ],
    providers: [
        DefaultPaginationService,
        {provide: UserAndGroupNavigator, useClass: UserAndGroupDefaultNavigator},
        {provide: MicroserviceOverviewService, useClass: MicroserviceOverviewService}
    ]
})
export class MicroserviceOverviewComponent implements OnInit {
    @Input() paginationId = 'crczp-microservice-overview';
    readonly INIT_SORT_NAME = 'name';
    readonly INIT_SORT_DIR = 'asc';
    /**
     * Data for microservices table component
     */
    microservices$: Observable<SentinelTable<Microservice>>;
    /**
     * True if error was thrown while getting data for microservies table, false otherwise
     */
    microservicesHasError$: Observable<boolean>;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    protected readonly async = async;

    constructor(
        private microserviceService: MicroserviceOverviewService,
        private paginationService: PaginationStorageService
    ) {
    }

    ngOnInit(): void {
        const initialLoadEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(
                0,
                this.paginationService.loadPageSize(),
                this.INIT_SORT_NAME,
                this.INIT_SORT_DIR
            )
        };
        this.microservices$ = this.microserviceService.resource$.pipe(
            map((microservices) => new MicroserviceTable(microservices))
        );
        this.microservicesHasError$ = this.microserviceService.hasError$;
        this.microserviceService.selected$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.initControls());
        this.onTableLoadEvent(initialLoadEvent);
    }

    onControlsAction(controlItem: SentinelControlItemSignal): void {
        controlItem.result$.pipe(take(1)).subscribe();
    }

    /**
     * Clears selected microservices and calls service to get new data for microservices table
     * @param event event emitted from table component
     */
    onTableLoadEvent(event: TableLoadEvent): void {
        this.paginationService.savePageSize(event.pagination.size);
        this.microserviceService
            .getAll(event.pagination as OffsetPaginationEvent, event.filter)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Resolves type of action call appropriate handler
     * @param event action event emitted by table component
     */
    onTableAction(event: TableActionEvent<Microservice>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    private initControls() {
        this.controls = [
            new RegisterControlItem(
                'Register',
                of(false),
                defer(() => this.microserviceService.register())
            )
        ];
    }
}
