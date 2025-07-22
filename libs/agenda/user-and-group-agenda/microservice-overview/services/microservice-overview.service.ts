import {MicroserviceFilter, SelectablePaginatedService,} from '@crczp/user-and-group-agenda/internal';
import {inject, Injectable} from '@angular/core';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {MicroserviceApi} from '@crczp/user-and-group-api';
import {Router} from '@angular/router';
import {Microservice} from '@crczp/user-and-group-model';
import {Observable, of} from 'rxjs';
import {tap} from 'rxjs/operators';
import {ErrorHandlerService, PortalConfig, Routing} from '@crczp/common';

@Injectable()
export class MicroserviceOverviewService extends SelectablePaginatedService<Microservice> {
    private api = inject(MicroserviceApi);
    private router = inject(Router);
    private errorHandler = inject(ErrorHandlerService);

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets all microservices with requested pagination and filters, updates related observables or handles an error
     * @param pagination requested pagination
     * @param filter filter to be applied on microservices
     */
    getAll(
        pagination: OffsetPaginationEvent,
        filter: string = null
    ): Observable<PaginatedResource<Microservice>> {
        this.clearSelection();
        const filters = filter ? [new MicroserviceFilter(filter)] : [];
        this.hasErrorSubject$.next(false);
        return this.api.getAll(pagination, filters).pipe(
            tap(
                (microservices) => {
                    this.resourceSubject$.next(microservices);
                },
                (err) => {
                    this.errorHandler.emit(err, 'Fetching microservices');
                    this.hasErrorSubject$.next(true);
                }
            )
        );
    }

    register(): Observable<any> {
        this.router.navigate([Routing.RouteBuilder.microservice.create.build()]);
        return of(true);
    }
}
