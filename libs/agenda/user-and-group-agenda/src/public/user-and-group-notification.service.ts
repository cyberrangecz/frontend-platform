/**
 * Service emitting notification from user and group-overview library
 */
import { Observable } from 'rxjs';

export abstract class UserAndGroupNotificationService {
    /**
     * Emits notification
     * @param type type of notification
     * @param message message of notification
     * @param action name of the action button displayed in the notification
     *  Returns observable.
     *  Value of the observable is true if the provided action was selected, false otherwise (no reaction or dismissed)
     */
    abstract emit(
        type: 'error' | 'warning' | 'info' | 'success',
        message: string,
        action?: string,
    ): Observable<boolean>;
}
