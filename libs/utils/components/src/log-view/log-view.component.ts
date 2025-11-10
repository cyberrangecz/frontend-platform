import {
    AfterViewInit,
    Component,
    DOCUMENT,
    effect,
    ElementRef,
    HostListener,
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
import { openSearchPanel, search } from '@codemirror/search';
import { crczpCodeEditorTheme } from './crczp-editor-theme';

const BOTTOM_MARGIN = 32; // px

@Component({
    selector: 'crczp-log-view',
    imports: [CommonModule, MatIcon, MatIconButton, MatTooltip, CodeEditor],
    templateUrl: './log-view.component.html',
    styleUrl: './log-view.component.scss',
})
export class LogView implements AfterViewInit {
    @ViewChild('codeEditor')
    codeViewer?: CodeEditor;

    @ViewChild('codeContainer')
    codeContainer?: ElementRef<HTMLElement>;

    notificationService = inject(NotificationService);
    document = inject(DOCUMENT);

    height = input<CSSStyleDeclaration['height']>('100%');

    value = input<string>();
    extensions = input<any[]>([
        search({
            caseSensitive: false,
        }),
        crczpCodeEditorTheme,
    ]);
    readonly = input<boolean>(true);

    appliedHeight = signal<CSSStyleDeclaration['height']>('100%');

    lineWrapping = signal<boolean>(false);
    isMaximized = signal<boolean>(false);
    private resizeObserver?: ResizeObserver;
    private shouldScrollToBottom = signal<boolean>(false);
    private previousScrollHeight = 0;
    private previousDistanceFromBottom = 0;

    constructor() {
        toObservable(this.shouldScrollToBottom).subscribe((value) => {
            if (value) {
                this.shouldScrollToBottom.set(false);
                this.scrollToBottom();
            }
        });
        toObservable(this.height).subscribe((height) => {
            if (!this.isMaximized()) {
                this.appliedHeight.set(height);
            }
        });

        // Track value changes to maintain scroll position
        effect(() => {
            const _currentValue = this.value();

            // On next tick after value changes, restore or adjust scroll position
            setTimeout(() => {
                const scrollElem = this.getScrollerElement();
                if (!scrollElem) return;

                // If user was at bottom (within margin), stay at bottom with new content
                if (this.previousDistanceFromBottom <= BOTTOM_MARGIN) {
                    this.scrollToBottom();
                } else {
                    // Calculate the amount of new content added
                    const currentScrollHeight = scrollElem.scrollHeight;
                    const heightDifference =
                        currentScrollHeight - this.previousScrollHeight;

                    // Adjust scrollTop by the amount of content added to maintain relative position
                    // New scrollTop = old scrollTop + added content height
                    const newScrollTop =
                        scrollElem.scrollTop + heightDifference;
                    scrollElem.scrollTop = newScrollTop;

                    // Update tracked values after adjustment
                    this.previousScrollHeight = currentScrollHeight;
                    this.previousDistanceFromBottom =
                        currentScrollHeight -
                        newScrollTop -
                        scrollElem.clientHeight;
                }
            }, 0);
        });
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        // esc to exit fullscreen
        if (event.key === 'Escape' && this.isMaximized()) {
            this.toggleFullscreen();
        }
    }

    ngAfterViewInit() {
        // Wait for CodeMirror to initialize and find the cm-scroller element
        setTimeout(() => {
            const scrollElem = this.getScrollerElement();
            if (!scrollElem) {
                console.warn('[LogView] Could not find .cm-scroller element');
                return;
            }

            // Initialize scroll tracking values
            this.previousScrollHeight = scrollElem.scrollHeight;
            this.previousDistanceFromBottom =
                scrollElem.scrollHeight -
                scrollElem.scrollTop -
                scrollElem.clientHeight;

            let scrollPositionBeforeResize = {
                scrollTop: scrollElem.scrollTop,
                scrollHeight: scrollElem.scrollHeight,
                clientHeight: scrollElem.clientHeight,
            };

            scrollElem.addEventListener('scroll', () => {
                scrollPositionBeforeResize = {
                    scrollTop: scrollElem.scrollTop,
                    scrollHeight: scrollElem.scrollHeight,
                    clientHeight: scrollElem.clientHeight,
                };

                // Track current scroll height and distance from bottom for content changes
                this.previousScrollHeight = scrollElem.scrollHeight;
                this.previousDistanceFromBottom =
                    scrollElem.scrollHeight -
                    scrollElem.scrollTop -
                    scrollElem.clientHeight;
            });

            this.resizeObserver = new ResizeObserver((_) => {
                const wasNearBottom =
                    scrollPositionBeforeResize.scrollHeight -
                        scrollPositionBeforeResize.scrollTop -
                        scrollPositionBeforeResize.clientHeight <=
                    BOTTOM_MARGIN;

                const nearBottom = this.isNearBottom();

                if (wasNearBottom) {
                    this.shouldScrollToBottom.set(true);
                } else if (nearBottom) {
                    this.shouldScrollToBottom.set(true);
                }

                scrollPositionBeforeResize = {
                    scrollTop: scrollElem.scrollTop,
                    scrollHeight: scrollElem.scrollHeight,
                    clientHeight: scrollElem.clientHeight,
                };
            });

            // Observe the cm-scroller element for size changes
            this.resizeObserver.observe(scrollElem);
        }, 100);
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

    alignBottom() {
        if (this.codeContainer) {
            setTimeout(() => {
                if (!this.codeContainer) return;

                const el = this.codeContainer.nativeElement;
                const rect = el.getBoundingClientRect();
                const bottomOfElement = rect.bottom;
                const viewportHeight = window.innerHeight;
                if (bottomOfElement > viewportHeight) {
                    el.scrollIntoView({
                        behavior: 'smooth',
                        block: 'end',
                        inline: 'nearest',
                    });

                    setTimeout(() => {
                        window.scrollBy({
                            top: 48,
                            behavior: 'smooth',
                        });
                    }, 100);
                }
            }, 100);
        }
    }

    scrollToBottom() {
        const el = this.getScrollerElement();
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }

    scrollToTop() {
        const el = this.getScrollerElement();
        if (el) {
            el.scrollTop = 0;
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
        this.isMaximized.set(!this.isMaximized());
        if (this.isMaximized()) {
            this.document.body.classList.add('fullscreen-active');
            this.appliedHeight.set('calc(100vh - 48px)');
        } else {
            this.document.body.classList.remove('fullscreen-active');
            this.appliedHeight.set(this.height());
        }
    }

    private getScrollerElement(): HTMLElement | null {
        if (!this.codeContainer) return null;
        return this.codeContainer.nativeElement.querySelector('.cm-scroller');
    }

    private isNearBottom(): boolean {
        const el = this.getScrollerElement();
        if (!el) return false;
        const distanceFromBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight;
        return distanceFromBottom <= BOTTOM_MARGIN;
    }
}
