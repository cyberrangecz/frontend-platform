import { DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { PortalConfig } from '@crczp/utils';
import { Subscription } from 'rxjs';
import { AttachmentDownloadQueue } from './attachment-download-queue';
import { AttachmentSource } from './attachment-source';

export type AttachmentDownloadState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Downloads one attachment through the injected source and exposes the transfer as signals: the
 * state, the progress as a 0 to 1 fraction (null while the total is unknown) and the object URL
 * of the finished file. Created in an injection context; releases its object URL on destroy.
 */
export class AttachmentDownload {
    private readonly source = inject(AttachmentSource);
    private readonly queue = inject(AttachmentDownloadQueue);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly autoDownloadLimitBytes = inject(PortalConfig).attachments.autoDownloadLimitBytes;
    private subscription?: Subscription;
    private objectUrl?: string;

    readonly state = signal<AttachmentDownloadState>('idle');
    readonly progress = signal<number | null>(null);
    readonly url = signal<string | null>(null);

    constructor(private readonly hash: () => string) {
        inject(DestroyRef).onDestroy(() => {
            this.queue.remove(this);
            this.release();
        });
    }

    /** Whether the file is already at hand, so starting the download transfers nothing. */
    alreadyDownloaded(): boolean {
        return this.source.isDownloaded(this.hash());
    }

    /** Starts the download, replacing one still running. */
    start(): void {
        this.release();
        this.state.set('loading');
        this.progress.set(null);
        this.subscription = this.source.download(this.hash()).subscribe({
            next: (event) => {
                if (event.type === 'progress') {
                    this.progress.set(event.total ? event.loaded / event.total : null);
                    return;
                }
                if ('url' in event) {
                    this.url.set(event.url);
                } else {
                    this.objectUrl = URL.createObjectURL(event.blob);
                    this.url.set(this.objectUrl);
                }
                this.progress.set(1);
                this.state.set('loaded');
            },
            error: () => this.state.set('error'),
            complete: () => {
                if (this.state() === 'loading') {
                    this.state.set('error');
                }
            },
        });
    }

    /**
     * Downloads a file below the configured auto-download limit by itself: at once when the bytes
     * are already at hand, otherwise in turn through the shared queue. A larger file waits for an
     * explicit start.
     */
    startIfSmall(sizeBytes: number): void {
        if (sizeBytes >= this.autoDownloadLimitBytes) {
            return;
        }
        if (this.alreadyDownloaded()) {
            this.start();
            return;
        }
        this.queue.enqueue(this, this.host);
    }

    /** Starts the download again after a failure. */
    retry(): void {
        this.start();
    }

    private release(): void {
        this.subscription?.unsubscribe();
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
        }
        this.objectUrl = undefined;
        this.url.set(null);
    }
}
