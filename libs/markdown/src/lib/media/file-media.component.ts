import { ChangeDetectionStrategy, Component, computed, effect, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AttachmentDownload } from '../attachment/attachment-download';
import { DownloadConfirmation } from '../attachment/download-confirmation';
import { saveFile } from '../attachment/save-file';
import { DownloadIconComponent } from './download-icon.component';
import { typeLabelOf } from '../attachment/attachment-kind';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { ByteSizePipe } from '../attachment/byte-size.pipe';
import { ProgressRingComponent } from './progress-ring.component';

/**
 * A file card with its type, name and size and a download action. The bytes are fetched on
 * click and saved when they arrive. The host carries the state (idle, loading, loaded, error)
 * as a class and a data attribute, and the progress as a custom property.
 */
@Component({
    selector: 'crczp-file-media',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, ByteSizePipe, ProgressRingComponent, DownloadIconComponent],
    templateUrl: './file-media.component.html',
    styleUrl: './file-media.component.scss',
    host: {
        '[class]': '"file-media--" + download.state()',
        '[attr.data-state]': 'download.state()',
        '[style.--file-media-progress]': 'download.progress()',
    },
})
export class FileMediaComponent {
    readonly metadata = input.required<AttachmentMetadata>();
    readonly label = input('');

    protected readonly download = new AttachmentDownload(() => this.metadata().hash);
    protected readonly typeLabel = computed(() => typeLabelOf(this.metadata()));
    protected readonly confirmation = new DownloadConfirmation(() => this.metadata().fileName);
    protected readonly actionLabel = computed(() => {
        const { fileName } = this.metadata();
        switch (this.download.state()) {
            case 'loading':
                return `Downloading ${fileName}`;
            case 'error':
                return `Retry downloading ${fileName}`;
            default:
                return `Download ${fileName}`;
        }
    });
    private readonly saveRequested = signal(false);

    constructor() {
        effect(() => {
            const url = this.download.url();
            if (url && untracked(this.saveRequested)) {
                this.saveRequested.set(false);
                this.save(url);
            }
        });
        effect(() => {
            if (this.download.state() === 'error') {
                untracked(() => this.saveRequested.set(false));
            }
        });
    }

    /** Saves the file, fetching it first when it is not yet downloaded; ignored during a confirmation or a running transfer. */
    protected startDownload(): void {
        if (this.confirmation.active() || this.download.state() === 'loading') {
            return;
        }
        const url = this.download.url();
        if (url) {
            this.save(url);
            return;
        }
        this.saveRequested.set(true);
        this.download.start();
    }

    private save(url: string): void {
        saveFile(url, this.metadata().fileName);
        this.confirmation.start();
    }
}
