import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, Observable, ReplaySubject, Subject } from 'rxjs';
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
    private topologyWidthSubject = new ReplaySubject<number>(1);
    private topologyHeightSubject = new ReplaySubject<number>(1);
    private maxWidthSubject = new BehaviorSubject<number | null>(null);
    private minWidthSubject = new BehaviorSubject<number | null>(null);
    public topologyDimensions$ = combineLatest([
        this.topologyWidthSubject.asObservable(),
        this.maxWidthSubject.asObservable(),
        this.minWidthSubject.asObservable(),
        this.topologyHeightSubject.asObservable(),
    ]).pipe(
        distinctUntilChanged(
            (
                [aWidth, aMaxWidth, aMinWidth, aHeight],
                [bWidth, bMaxWidth, bMinWidth, bHeight],
            ) =>
                aWidth === bWidth &&
                aMaxWidth === bMaxWidth &&
                aMinWidth === bMinWidth &&
                aHeight === bHeight,
        ),
        map(
            ([width, maxWidth, minWidth, height]) =>
                ({
                    width: Math.min(
                        Math.max(width, minWidth ?? width),
                        maxWidth ?? width,
                    ),

                    height,
                }) as ResizeEvent,
        ),
    );
    private widthPreCollapse = 0;

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
        if (!this.isCollapsedSubject.value) {
            this.widthPreCollapse = width;
        }
        if (width <= 0) {
            width = 1;
        }
        this.topologyWidthSubject.next(width);
    }

    /**
     * Sets the maximum allowed width in pixels for the topology component.
     *
     * @param maxWidth - The maximum width in pixels. If null, no maximum is enforced.
     */
    public setMaxTopologyWidth(maxWidth: number | null) {
        if (maxWidth !== null && maxWidth <= 0) {
            this.maxWidthSubject.next(1);
        }
        this.maxWidthSubject.next(maxWidth);
    }

    public setMinTopologyWidth(minWidth: number | null) {
        if (minWidth !== null && minWidth <= 0) {
            this.minWidthSubject.next(1);
        }
        this.minWidthSubject.next(minWidth);
    }

    /**
     * Emits a new value indicating a change in the topology height.
     * @param {number} height - The new height value to emit.
     */
    public emitTopologyHeightChange(height: number) {
        if (height <= 0) {
            height = 1;
        }
        this.topologyHeightSubject.next(height);
    }

    toggleCollapsed() {
        this.isCollapsedSubject.next(!this.isCollapsedSubject.value);
        if (!this.isCollapsedSubject.value) {
            this.topologyWidthSubject.next(this.widthPreCollapse);
        }
    }

    setTopologyCollapsed(collapsed: boolean) {
        this.isCollapsedSubject.next(collapsed);
    }
}
