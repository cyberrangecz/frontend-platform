import {tap} from 'rxjs/operators';
import {ResourcesApi} from '@crczp/sandbox-api';
import {Observable, ReplaySubject} from 'rxjs';
import {inject, Injectable} from '@angular/core';
import {Resources} from '@crczp/sandbox-model';
import {SandboxResourcesService} from './sandbox-resources.service';
import {ErrorHandlerService} from "@crczp/common";

@Injectable()
export class SandboxResourcesConcreteService extends SandboxResourcesService {
    private resourcesApi = inject(ResourcesApi);
    private errorHandler = inject(ErrorHandlerService);

    private resourcesSubject$: ReplaySubject<Resources> = new ReplaySubject();
    resources$: Observable<Resources> = this.resourcesSubject$.asObservable();

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
