import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export abstract class TopologySplitViewSynchronizerService {
    private dragSubject = new Subject<number>();
    /**
     * Observable emitting position changes
     */
    public drag$: Observable<number> = this.dragSubject.asObservable();
    private isCollapsedSubject = new BehaviorSubject<boolean>(false);
    /**
     * Observable emitting external signals to collapse one side of the split panel
     */
    public topologyCollapsed$ = this.isCollapsedSubject.asObservable();
    private topologyWidthSubject = new Subject<number>();
    public topologyWidth$ = this.topologyWidthSubject.asObservable();

    /**
     * Notify everyone that the divider position has changed
     *
     * @param ratio - the new position of the divider in range (0, 1)
     * */
    public abstract emitDividerRatioChange(ratio: number): void;

    /**
     * Get observable of the divider position
     */
    public abstract getDividerPosition$(): Observable<number>;

    /**
     * Get the current divider position
     */
    public abstract getDividerPosition(): number | undefined;

    /**
     * Sends a signal to resize the split panel
     * Uses pixels, as the ratio cannot be easily determined
     * without knowledge of the split panel dimensions
     *
     * @param delta - pixels change
     */
    public emitPositionChange(delta: number) {
        this.dragSubject.next(delta);
    }

    /**
     * Emits a new value indicating a change in the topology width.
     *
     * @param {number} width - The new width value to emit.
     */
    public emitTopologyWidthChange(width: number) {
        this.topologyWidthSubject.next(width);
    }

    /**
     * Sends a signal requesting that one side of
     * a split panel should collapse
     *
     * @param isCollapsed - whether to collapse topology
     */
    public emitCollapsed(isCollapsed: boolean) {
        this.isCollapsedSubject.next(isCollapsed);
    }
}
