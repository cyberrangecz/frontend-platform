import { Injectable, inject } from '@angular/core';
import {Router} from '@angular/router';
import {SandboxDefinitionApi} from '@crczp/sandbox-api';
import {SandboxDefinition} from '@crczp/sandbox-model';
import {BehaviorSubject, defer, finalize, Observable} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {SandboxErrorHandler, SandboxNavigator, SandboxNotificationService} from '@crczp/sandbox-agenda';
import {SandboxDefinitionEditService} from './sandbox-definition-edit.service';

@Injectable()
export class SandboxDefinitionEditConcreteService extends SandboxDefinitionEditService {
    private api = inject(SandboxDefinitionApi);
    private router = inject(Router);
    private navigator = inject(SandboxNavigator);
    private alertService = inject(SandboxNotificationService);
    private errorHandler = inject(SandboxErrorHandler);


    private requestsCountSubject$ = new BehaviorSubject<number>(0);

    public isLoading$: Observable<boolean> = this.requestsCountSubject$
        .asObservable()
        .pipe(map((count: number) => count > 0));

    /**
     * Creates a sandbox definition, informs about the result and updates list of sandbox definitions or handles an error
     * @param sandboxDefinition Sandbox definition to create
     */
    create(sandboxDefinition: SandboxDefinition): Observable<any> {
        return defer(() => {
            this.requestsCountSubject$.next(this.requestsCountSubject$.value + 1);
            return this.api.create(sandboxDefinition).pipe(
                tap(
                    () => this.alertService.emit('success', 'Sandbox definition was successfully created'),
                    (err) => this.errorHandler.emit(err, 'Creating sandbox definition'),
                ),
                switchMap(() => this.router.navigate([this.navigator.toSandboxDefinitionOverview()])),
                finalize(() => this.requestsCountSubject$.next(this.requestsCountSubject$.value - 1)),
            );
        });
    }
}
