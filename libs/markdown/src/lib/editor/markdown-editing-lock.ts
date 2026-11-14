import { Signal } from '@angular/core';

/**
 * Locks every markdown editor below the element that provides it into its read-only state: the
 * view switch and the rendered preview keep working, nothing can be changed.
 */
export abstract class MarkdownEditingLock {
    /** Whether the editors below are locked. */
    abstract readonly locked: Signal<boolean>;
}
