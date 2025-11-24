import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, Subject } from 'rxjs';
import { ResizeEvent } from '@sentinel/common/resize';

/**
 * Service to allow controlling the properties of topology component
 * from the outside
 */
@Injectable({
    providedIn: 'root',
})
export class TopologySynchronizerService {
    protected readonly destroyRef = inject(DestroyRef);

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
    private topologyHeightSubject = new Subject<number>();
    public topologyDimensions$ = combineLatest([
        this.topologyWidthSubject.asObservable(),
        this.topologyHeightSubject.asObservable(),
    ]).pipe(map(([width, height]) => ({ width, height } as ResizeEvent)));


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
     * Emits a new value indicating a change in the topology height.
     * @param {number} height - The new height value to emit.
     */
    public emitTopologyHeightChange(height: number) {
        this.topologyHeightSubject.next(height);
    }


    toggleCollapsed() {
        this.isCollapsedSubject.next(!this.isCollapsedSubject.value);
    }

    setTopologyCollapsed(collapsed: boolean) {
        this.isCollapsedSubject.next(collapsed);
    }
}
