import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DestroyRef, inject, signal } from '@angular/core';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** How long a finished download shows its confirmation before the card is ready again. */
export const DOWNLOAD_CONFIRMATION_MILLISECONDS = 1600;

/**
 * The short confirmation that follows a finished download. While it runs, `active` is true and
 * the finish is announced to screen readers once; it ends by itself. Created in an injection
 * context.
 */
export class DownloadConfirmation {
    private readonly announcer = inject(LiveAnnouncer);
    private readonly destroyRef = inject(DestroyRef);

    readonly active = signal(false);

    constructor(private readonly fileName: () => string) {}

    /** Starts the confirmation; does nothing while one is already running. */
    start(): void {
        if (this.active()) {
            return;
        }
        this.active.set(true);
        void this.announcer.announce(`Downloaded ${this.fileName()}`, 'polite');
        timer(DOWNLOAD_CONFIRMATION_MILLISECONDS)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.active.set(false));
    }
}
