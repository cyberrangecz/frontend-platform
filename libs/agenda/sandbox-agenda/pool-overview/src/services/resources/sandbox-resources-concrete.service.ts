import { SandboxErrorHandler } from '@crczp/sandbox-agenda';
import { tap } from 'rxjs/operators';
import { ResourcesApi } from '@crczp/sandbox-api';
import { Observable, ReplaySubject } from 'rxjs';
import { Injectable } from '@angular/core';
import { Resources } from '@crczp/sandbox-model';
import { SandboxResourcesService } from 'libs/agenda/sandbox-agenda/pool-overview/src/services/resources/sandbox-resources.service';

@Injectable()
export class SandboxResourcesConcreteService extends SandboxResourcesService {
    private resourcesSubject$: ReplaySubject<Resources> = new ReplaySubject();
    resources$: Observable<Resources> = this.resourcesSubject$.asObservable();

    constructor(
        private resourcesApi: ResourcesApi,
        private errorHandler: SandboxErrorHandler,
    ) {
        super();
    }

    getResources(): Observable<Resources> {
        return this.resourcesApi.getResources().pipe(
            tap(
                (resource) => {
                    this.resourcesSubject$.next(resource);
                },
                (err) => {
                    this.errorHandler.emit(err, 'Fetching resources');
                },
            ),
        );
    }
}
