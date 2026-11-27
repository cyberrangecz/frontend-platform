import { effect, Injectable, signal, untracked } from '@angular/core';
import { AttachmentDownload } from './attachment-download';

interface QueuedDownload {
    readonly download: AttachmentDownload;
    readonly element: HTMLElement;
}

/**
 * Runs the automatic attachment downloads one after another in the order their cards appear in
 * the document, top to bottom. A card that is waiting stays idle until its turn; a download
 * started by hand counts as the running one, so the queue never runs two at once. Entries are
 * ordered by their current position in the document each time a turn comes, so adding,
 * removing and reordering cards changes the order of the waiting ones.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentDownloadQueue {
    private readonly entries = signal<readonly QueuedDownload[]>([]);

    constructor() {
        effect(() => {
            const entries = this.entries();
            if (entries.some(({ download }) => download.state() === 'loading')) {
                return;
            }
            const next = [...entries]
                .filter(({ download }) => download.state() === 'idle')
                .sort(({ element: first }, { element: second }) => documentOrder(first, second))[0];
            if (next) {
                untracked(() => next.download.start());
            }
        });
    }

    /** Adds a download that starts by itself when every card above it has been served. */
    enqueue(download: AttachmentDownload, element: HTMLElement): void {
        this.entries.update((entries) => (entries.some((entry) => entry.download === download) ? entries : [...entries, { download, element }]));
    }

    /** Takes a download out of the queue, whether it waits, runs or is done. */
    remove(download: AttachmentDownload): void {
        this.entries.update((entries) => entries.filter((entry) => entry.download !== download));
    }
}

function documentOrder(first: HTMLElement, second: HTMLElement): number {
    if (first === second) {
        return 0;
    }
    return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}
