import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, startWith } from 'rxjs';
import { DividerPositionSynchronizerService } from './divider-position-synchronizer.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { unique } from '../../../../logic/unique';

@Injectable({
    providedIn: 'root',
})
/**
 * Implementation of the divider position synchronizer service
 *
 * Adds the ability to save and load the divider position from the local storage
 * making the position persistent between page reloads
 */
export class PersistentDividerPositionSynchronizerService extends DividerPositionSynchronizerService {
    private readonly localStorageKey = 'dividerPosition';

    private splitViewDimensionsSubject = new BehaviorSubject(this.loadDividerPosition());

    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        super();
    }

    /**
     * Notify everyone that the divider position has changed
     *
     * @param percentPosition - the new position of the divider in range (0, 1)
     */
    public emitDividerChange(percentPosition: number): void {
        this.saveDividerPosition(percentPosition);
        this.splitViewDimensionsSubject.next(percentPosition);
    }

    /**
     * Get observable of the divider position
     *
     * Non-unique values are filtered out
     *
     * @returns Observable of the divider position as a ratio in range (0, 1)
     */
    public getDividerPosition$(): Observable<number> {
        return this.splitViewDimensionsSubject.pipe(
            takeUntilDestroyed(this.destroyRef),
            startWith(this.splitViewDimensionsSubject.value),
            filter((ratio) => !!ratio),
            unique((a, b) => a === b),
        );
    }

    /**
     * Get the current divider position
     *
     * @returns the divider position as a ratio in range (0, 1)
     */
    public getDividerPosition(): number | undefined {
        return this.splitViewDimensionsSubject.value;
    }

    private saveDividerPosition(ratio: number): void {
        localStorage.setItem(this.localStorageKey, ratio.toString());
    }

    private loadDividerPosition(): number | undefined {
        const data = localStorage.getItem(this.localStorageKey);
        if (!data) {
            return undefined;
        }
        return parseFloat(data);
    }
}
