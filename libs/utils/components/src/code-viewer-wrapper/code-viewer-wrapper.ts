import {
    AfterViewInit,
    Component,
    ContentChild,
    ElementRef,
    inject,
    input,
    model,
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

const BOTTOM_MARGIN = 32; // px

@Component({
    selector: 'crczp-code-viewer-wrapper',
    imports: [CommonModule, MatIcon, MatIconButton, MatTooltip],
    templateUrl: './code-viewer-wrapper.html',
    styleUrl: './code-viewer-wrapper.scss',
})
export class CodeViewerWrapper implements AfterViewInit {
    @ContentChild(CodeEditor)
    codeViewer?: CodeEditor;

    @ViewChild('scrollContainer')
    scrollContainer?: ElementRef<HTMLElement>;

    @ViewChild('resizeableContent')
    resizeableContent?: ElementRef<HTMLElement>;

    notificationService = inject(NotificationService);

    height = input<CSSStyleDeclaration['height']>('100%');

    lineWrapping = model<boolean>(false);
    private resizeObserver?: ResizeObserver;
    private shouldScrollToBottom = signal<boolean>(false);

    constructor() {
        toObservable(this.shouldScrollToBottom).subscribe((value) => {
            if (value) {
                this.shouldScrollToBottom.set(false);
                this.scrollToBottom();
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
                'Failed to bind scroll observer, content unavailable'
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
                        'Contents copied to clipboard'
                    );
                },
                () => {
                    this.notificationService.emit(
                        'error',
                        'Failed to copy contents to clipboard'
                    );
                }
            );
        } else {
            this.notificationService.emit(
                'error',
                'No code viewer available to copy from'
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

    private isNearBottom(): boolean {
        if (!this.scrollContainer) return false;
        const el = this.scrollContainer.nativeElement;
        return (
            el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_MARGIN
        );
    }
}
