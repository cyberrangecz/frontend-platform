import { computed, signal, Signal } from '@angular/core';
import { MonoTypeOperatorFunction, Observable, tap } from 'rxjs';

/**
 * Tracks which named parts of a page hold edits that have not reached the server,
 * so a route guard can block navigation and each part can show its own indicator.
 *
 * A source is in sync until reported otherwise through {@link set}, and returns to
 * being in sync either through {@link set} or by completing an operation wrapped in
 * {@link clearOnSuccess}. An operation that errors leaves its source unsaved.
 *
 * @typeParam TSource Union of the source names this tracker accepts, narrowing every
 * method to the parts the page actually has.
 */
export class UnsavedChangesTracker<TSource extends string = string> {
    private readonly unsavedSources = signal<ReadonlySet<TSource>>(new Set());

    /**
     * True while at least one source holds edits that have not reached the server.
     */
    readonly hasAny: Signal<boolean> = computed(
        () => this.unsavedSources().size > 0,
    );

    /**
     * Records whether the named source currently holds edits that have not reached
     * the server.
     *
     * @param source Identifier of the page part being reported on.
     * @param isUnsaved True when the part holds edits, false when it is in sync.
     */
    set(source: TSource, isUnsaved: boolean): void {
        this.unsavedSources.update((unsaved) => {
            if (unsaved.has(source) === isUnsaved) {
                return unsaved;
            }
            const next = new Set(unsaved);
            if (isUnsaved) {
                next.add(source);
            } else {
                next.delete(source);
            }
            return next;
        });
    }

    /**
     * Reports one source in isolation, for a page showing a separate indicator per part.
     *
     * @param source Identifier of the page part being queried.
     * @returns True while that source holds edits that have not reached the server.
     */
    has(source: TSource): boolean {
        return this.unsavedSources().has(source);
    }

    /**
     * Marks the named source in sync on the wrapped operation's first value or its
     * completion, whichever arrives first, and leaves it unsaved when the operation
     * errors.
     *
     * Both notifications are observed because a downstream `take(1)` tears the chain
     * down on the first value, so the operation's own completion never reaches this
     * operator; an operation that completes without emitting is covered by the other.
     *
     * @param source Identifier of the page part the operation persists.
     * @returns An operator passing values and errors through untouched.
     */
    clearOnSuccess<T>(source: TSource): MonoTypeOperatorFunction<T> {
        const markInSync = () => this.set(source, false);
        return (operation$: Observable<T>) =>
            operation$.pipe(tap({ next: markInSync, complete: markInSync }));
    }
}
