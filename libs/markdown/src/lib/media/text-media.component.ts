import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Clipboard } from '@angular/cdk/clipboard';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeEditor } from '@acrodata/code-editor';
import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';
import { from, switchMap, throwError, timer } from 'rxjs';
import { AttachmentDownload } from '../attachment/attachment-download';
import { DownloadConfirmation } from '../attachment/download-confirmation';
import { saveFile } from '../attachment/save-file';
import { formatBytes, typeLabelOf } from '../attachment/attachment-kind';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { ByteSizePipe } from '../attachment/byte-size.pipe';
import { DownloadIconComponent } from './download-icon.component';
import { textPreviewExtensions } from './text-preview.extensions';

/** Fewest lines that make a preview start collapsed. */
const COLLAPSE_MIN_LINES = 12;

const COPIED_DURATION_MS = 2000;

/**
 * A text attachment, such as a configuration file or script, shown inline in a framed, read-only
 * code view with line numbers and token colours. A file under the auto-load limit downloads right
 * after the card renders; a larger one waits for the reader to load it. A long file starts
 * collapsed to its first lines and expands in place. The file can be downloaded at any time and
 * copied once loaded. The host carries the state (waiting, loading, loaded, error) as a class and
 * a data attribute, and the download progress as a custom property.
 */
@Component({
    selector: 'crczp-text-media',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CodeEditor, MatButtonModule, MatIconModule, MatTooltipModule, NgxSkeletonLoaderComponent, ByteSizePipe, DownloadIconComponent],
    templateUrl: './text-media.component.html',
    styleUrl: './text-media.component.scss',
    host: {
        '[class]': '"text-media--" + state()',
        '[attr.data-state]': 'state()',
        '[style.--text-media-progress]': 'download.progress()',
    },
})
export class TextMediaComponent {
    private readonly clipboard = inject(Clipboard);
    private readonly announcer = inject(LiveAnnouncer);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);
    private readonly body = viewChild<ElementRef<HTMLElement>>('body');

    readonly metadata = input.required<AttachmentMetadata>();
    private readonly metadataSize = computed(() => this.metadata().size);
    readonly label = input('');

    protected readonly download = new AttachmentDownload(() => this.metadata().hash);
    protected readonly confirmation = new DownloadConfirmation(() => this.metadata().fileName);
    protected readonly languages = languages;
    protected readonly extensions = textPreviewExtensions;
    protected readonly skeletonTheme = {
        height: 'var(--space-md)',
        marginBottom: 'var(--space-sm)',
        background: 'var(--mat-sys-surface-container-high)',
    };

    protected readonly language = computed(
        () => LanguageDescription.matchFilename(languages, this.metadata().fileName)?.name ?? '',
    );
    protected readonly title = computed(() => this.label().trim() || this.metadata().fileName);
    /** The file name, shown apart from the title only when the label names something else. */
    protected readonly separateFileName = computed(() =>
        this.title() === this.metadata().fileName ? null : this.metadata().fileName,
    );
    protected readonly typeLabel = computed(() => typeLabelOf(this.metadata()));
    protected readonly downloadTooltip = computed(
        () => `Download ${this.metadata().fileName}, ${formatBytes(this.metadata().size)}`,
    );

    private readonly content = rxResource({
        params: () => this.download.url() ?? undefined,
        stream: ({ params }) => from(fetch(params)).pipe(switchMap((response) => (response.ok ? from(response.text()) : throwError(() => new Error(`Text file answered ${response.status}`))))),
    });
    protected readonly text = computed(() => (this.content.hasValue() ? this.content.value() : null));
    /** The text as drawn, without the newline that ends its last line. */
    protected readonly shownText = computed(() => (this.text() ?? '').replace(/\n$/, ''));
    protected readonly lineCount = computed(() => this.shownText().split('\n').length);
    protected readonly state = computed<'waiting' | 'loading' | 'loaded' | 'error'>(() => {
        const downloadState = this.download.state();
        if (downloadState === 'error' || this.content.error()) {
            return 'error';
        }
        if (downloadState === 'idle') {
            return 'waiting';
        }
        return this.text() === null ? 'loading' : 'loaded';
    });
    protected readonly collapsible = computed(() => this.lineCount() >= COLLAPSE_MIN_LINES);
    protected readonly expanded = signal(false);
    /** Height the code view animates between while it expands or collapses; null while it is collapsed or settled open. */
    protected readonly expandedHeight = signal<number | null>(null);
    /** Whether the expansion has finished, after which the code view has no height limit. */
    protected readonly settled = signal(false);
    protected readonly copied = signal(false);
    private readonly saveRequested = signal(false);
    private readonly size = computed(() => this.metadata().size);

    constructor() {
        effect(() => {
            const size = this.metadataSize();
            untracked(() => {
                this.download.startIfSmall(size);
            });
        });
        effect(() => {
            const url = this.download.url();
            if (url && untracked(this.saveRequested)) {
                this.saveRequested.set(false);
                this.save(url);
            }
        });
    }

    protected load(): void {
        this.download.start();
    }

    protected saveFile(): void {
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

    protected toggleExpanded(): void {
        const body = this.body()?.nativeElement;
        if (!body) {
            return;
        }
        if (!this.expanded()) {
            this.expandedHeight.set(body.scrollHeight);
            this.expanded.set(true);
        } else if (this.settled()) {
            this.settled.set(false);
            this.expandedHeight.set(body.scrollHeight);
            afterNextRender(
                () => {
                    void body.offsetHeight;
                    this.expandedHeight.set(null);
                    this.expanded.set(false);
                },
                { injector: this.injector },
            );
        } else {
            this.expandedHeight.set(null);
            this.expanded.set(false);
        }
    }

    /** Lifts the height limit once the expansion has finished, so content that grows afterwards is not clipped. */
    protected onBodyTransitionEnd(event: TransitionEvent): void {
        if (event.target === event.currentTarget && event.propertyName === 'max-height' && this.expanded()) {
            this.settled.set(true);
            this.expandedHeight.set(null);
        }
    }

    protected copy(): void {
        const text = this.text();
        if (text === null || !this.clipboard.copy(text)) {
            return;
        }
        this.copied.set(true);
        void this.announcer.announce('Copied file contents', 'polite');
        timer(COPIED_DURATION_MS)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.copied.set(false));
    }

    private save(url: string): void {
        saveFile(url, this.metadata().fileName);
        this.confirmation.start();
    }
}
