import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';

/**
 * Global service holding state of active sandbox
 */
@Injectable()
export class SandboxService {
    private sandboxInstanceIdSubject: BehaviorSubject<string> =
        new BehaviorSubject(null);
    sandboxInstanceId$: Observable<string> =
        this.sandboxInstanceIdSubject.asObservable();

    private sandboxDefinitionIdSubject: BehaviorSubject<number> =
        new BehaviorSubject(null);
    sandboxDefinitionId$: Observable<number> =
        this.sandboxDefinitionIdSubject.asObservable();

    setSandboxInstanceId(sandboxUuid: string) {
        this.sandboxInstanceIdSubject.next(sandboxUuid);
    }

    setSandboxDefinitionId(id: number) {
        this.sandboxDefinitionIdSubject.next(id);
    }
}
