import {
    AfterViewInit,
    Component,
    DOCUMENT,
    ElementRef,
    inject,
    input,
    signal,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { NotificationService } from '@crczp/utils';
import { toObservable } from '@angular/core/rxjs-interop';
import { CodeEditor } from '@acrodata/code-editor';
import { openSearchPanel } from '@codemirror/search';

const BOTTOM_MARGIN = 32; // px

@Component({
    selector: 'crczp-code-viewer-wrapper',
    imports: [CommonModule, MatIcon, MatIconButton, MatTooltip, CodeEditor],
    templateUrl: './code-viewer-wrapper.html',
    styleUrl: './code-viewer-wrapper.scss',
})
export class CodeViewerWrapper implements AfterViewInit {
    @ViewChild('codeEditor')
    codeViewer?: CodeEditor;

    @ViewChild('scrollContainer')
    scrollContainer?: ElementRef<HTMLElement>;

    @ViewChild('resizeableContent')
    resizeableContent?: ElementRef<HTMLElement>;

    notificationService = inject(NotificationService);
    document = inject(DOCUMENT);

    height = input<CSSStyleDeclaration['height']>('100%');

    value = input<string>();
    extensions = input<any[]>([]);
    readonly = input<boolean>(true);

    appliedHeight = signal<CSSStyleDeclaration['height']>('100%');

    lineWrapping = signal<boolean>(false);
    isFullScreen = signal<boolean>(false);
    private resizeObserver?: ResizeObserver;
    private shouldScrollToBottom = signal<boolean>(false);

    constructor() {
        toObservable(this.shouldScrollToBottom).subscribe((value) => {
            if (value) {
                this.shouldScrollToBottom.set(false);
                this.scrollToBottom();
            }
        });
        toObservable(this.height).subscribe((height) => {
            if (!this.isFullScreen()) {
                this.appliedHeight.set(height);
            }
        });
    }

    ngAfterViewInit() {
        if (this.scrollContainer) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.isNearBottom()) {
                    this.shouldScrollToBottom.set(true);
                }
            });
            this.resizeObserver.observe(this.resizeableContent.nativeElement);
        } else {
            console.error(
                'Failed to bind scroll observer, content unavailable',
            );
        }
    }

    copyToClipboard() {
        if (this.codeViewer) {
            const code = this.codeViewer.value;
            navigator.clipboard.writeText(code).then(
                () => {
                    this.notificationService.emit(
                        'success',
                        'Contents copied to clipboard',
                    );
                },
                () => {
                    this.notificationService.emit(
                        'error',
                        'Failed to copy contents to clipboard',
                    );
                },
            );
        } else {
            this.notificationService.emit(
                'error',
                'No code viewer available to copy from',
            );
        }
    }

    scrollToBottom() {
        if (this.scrollContainer) {
            this.scrollContainer.nativeElement.scrollTop =
                this.scrollContainer.nativeElement.scrollHeight;
        }
    }

    scrollToTop() {
        if (this.scrollContainer) {
            this.scrollContainer.nativeElement.scrollTop = 0;
        }
    }

    openSearch() {
        if (this.codeViewer?.view) {
            openSearchPanel(this.codeViewer.view);
        } else {
            this.notificationService.emit(
                'error',
                'No code viewer available to search',
            );
        }
    }

    toggleFullscreen() {
        this.isFullScreen.set(!this.isFullScreen());
        if (this.isFullScreen()) {
            this.document.body.classList.add('fullscreen-active');
            this.appliedHeight.set('calc(100vh - 48px)');
        } else {
            this.document.body.classList.remove('fullscreen-active');
            this.appliedHeight.set(this.height());
        }
    }

    private isNearBottom(): boolean {
        if (!this.scrollContainer) return false;
        const el = this.scrollContainer.nativeElement;
        return (
            el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_MARGIN
        );
    }
}
