import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';

/**
 * Service to handle the state of the graph svg canvas.
 * Unlocked -> The graph can be freely dragged outside the boundaries and the canvas extends with it.
 * Locked -> The graph is locked to the size of current window and cannot be dragged outside the boundaries.
 */
@Injectable()
export class GraphLockService {
    private locked = true;
    private lockEventSubject: Subject<boolean> = new Subject<boolean>();

    lockedEvent: Observable<boolean> = this.lockEventSubject.asObservable();

    lock() {
        this.locked = true;
        this.lockEventSubject.next(true);
    }

    unlock() {
        this.locked = false;
        this.lockEventSubject.next(false);
    }

    getLocked(): boolean {
        return this.locked;
    }
}
