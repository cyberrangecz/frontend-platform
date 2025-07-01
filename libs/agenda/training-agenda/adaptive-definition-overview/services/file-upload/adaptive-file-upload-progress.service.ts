import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Reports on state of a file upload
 */
@Injectable()
export class AdaptiveFileUploadProgressService {
    private isInProgressSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    /**
     * True if file upload is in progress, false otherwise
     */
    isInProgress$: Observable<boolean> = this.isInProgressSubject$.asObservable();

    /**
     * Starts file upload
     */
    start(): void {
        this.isInProgressSubject$.next(true);
    }

    /**
     * Finishes file upload
     */
    finish(): void {
        this.isInProgressSubject$.next(false);
    }
}
