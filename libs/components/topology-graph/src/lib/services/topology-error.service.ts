import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {TopologyError} from '../model/others/topology-error.model';

/**
 * Global error handling service. Emits error from library through observable. Client app should subscribe to error$ observable and
 * display or log errors.
 */
@Injectable()
export class TopologyErrorService {
    private errorSubject: Subject<any> = new Subject<any>();
    error$ = this.errorSubject.asObservable();

    /**
     * Emits error
     * @param err error to emit
     */
    emitError(err: TopologyError) {
        this.errorSubject.next(err);
    }
}
