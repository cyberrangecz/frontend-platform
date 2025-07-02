/**
 * Service emitting errors from user and group-overview library
 */
import {HttpErrorResponse} from '@angular/common/http';
import {Observable} from 'rxjs';

export abstract class UserAndGroupErrorHandler {
    /**
     * Handles error and displays it in user friendly way
     * @param err http error
     * @param operation description of an operation which caused the error
     * @param action name of the action button displayed in the notification
     *  Returns observable.
     *  Value of the observable is true if the provided action was selected, false otherwise (no reaction or dismissed)
     */
    abstract emit(err: HttpErrorResponse, operation: string, action?: string): Observable<boolean>;
}
