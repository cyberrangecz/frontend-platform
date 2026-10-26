import {
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    computed,
    DOCUMENT,
    effect,
    ElementRef,
    HostListener,
    inject,
    input,
    OnDestroy,
    signal,
    untracked,
    viewChild,
} from '@angular/core';

import { CdkTrapFocus } from '@angular/cdk/a11y';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { NotificationService } from '@crczp/utils';
import { CodeEditor } from '@acrodata/code-editor';
import { saveAs } from 'file-saver';
import { from } from 'rxjs';
import { EditorState, Extension, Prec } from '@codemirror/state';
import {
    highlightSelectionMatches,
    openSearchPanel,
    search,
    searchKeymap,
} from '@codemirror/search';
import { EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { crczpCodeEditorTheme } from './crczp-editor-theme';
import { LogViewSkeleton } from './log-view-skeleton.component';
import {
    ANSIBLE_SKELETON_SAMPLE,
    LogSkeletonRow,
    TERRAFORM_SKELETON_SAMPLE,
} from './log-view-skeleton-samples';
import {
    holdReadingPosition,
    readingPosition,
    releaseReadingPosition,
} from './log-view-reading-position';
import { formatJsonInText } from './format-json-fragments';
import { LOG_VIEW_SETTINGS } from './log-view-settings';
import { LogViewSettingsPanel } from './log-view-settings-panel.component';
import { DEFAULT_LOG_PRESET, LOG_PRESETS } from './log-presets';
import { applyLogPalette } from './log-palette';
import { applyLogHighlightLevel, LogHighlightLevel } from './log-highlight-level';
import { terraformSupport } from './highlighting/terraform-highlighting';
import { ANSIBLE_RESULT_START, ansibleSupport } from './highlighting/ansible-highlighting';
import { LogViewTooltipDirective } from './log-view-tooltip.directive';
import {
    describeLogViewShortcuts,
    isMacPlatform,
    LogViewAction,
    matchLogViewShortcut,
} from './log-view-shortcuts';

const BOTTOM_MARGIN = 32; // px
const FULLSCREEN_HEIGHT = '100%';
const FULLSCREEN_BODY_CLASS = 'fullscreen-active';
const SCROLLER_LOOKUP_DELAY = 100; // ms
const ALIGN_BOTTOM_DELAY = 100; // ms
const LINE_ENDING = /\r\n?/g;
const DEFAULT_DOWNLOAD_FILE_NAME = 'log.log';
/** Places on the page whose keys belong to them rather than to a log view's shortcuts. */
const ELSEWHERE_ENGAGED_SELECTOR = [
    'input',
    'textarea',
    'select',
    '[contenteditable]:not([contenteditable="false"])',
    '[role="dialog"]',
    '.cdk-overlay-container',
    'crczp-log-view',
].join(', ');

export type SyntaxHighlighting = 'terraform' | 'ansible' | 'plaintext';

interface LogFormat {
    /** Highlighting extensions of the format. */
    readonly extensions: Extension[];
    /** Start of the JSON fragments the format can prettify; absent when the format has none. */
    readonly jsonFragmentStart?: RegExp;
    /** Row shapes the loading skeleton repeats. */
    readonly skeletonSample: readonly LogSkeletonRow[];
}

interface ToolbarAction {
    readonly run: () => void;
    /** Whether the action's button is enabled and shown; always when absent. */
    readonly isAvailable?: () => boolean;
}

const LOG_FORMATS = {
    terraform: { extensions: [terraformSupport], skeletonSample: TERRAFORM_SKELETON_SAMPLE },
    ansible: {
        extensions: [ansibleSupport],
        jsonFragmentStart: ANSIBLE_RESULT_START,
        skeletonSample: ANSIBLE_SKELETON_SAMPLE,
    },
    plaintext: { extensions: [], skeletonSample: TERRAFORM_SKELETON_SAMPLE },
} satisfies Record<SyntaxHighlighting, LogFormat>;

const BUSY_CONTENT = EditorView.contentAttributes.of({ 'aria-busy': 'true' });

const BASE_EXTENSIONS: Extension[] = [
    lineNumbers(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of(searchKeymap),
    search({ caseSensitive: false }),
    crczpCodeEditorTheme,
    readingPosition,
    EditorView.contentAttributes.of({
        'data-gramm': 'false',
        'data-gramm_editor': 'false',
        'data-enable-grammarly': 'false',
    }),
];

@Component({
    selector: 'crczp-log-view',
    imports: [
        CdkTrapFocus,
        MatIcon,
        MatIconButton,
        LogViewTooltipDirective,
        CodeEditor,
        LogViewSettingsPanel,
        LogViewSkeleton,
    ],
    templateUrl: './log-view.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './log-view.component.scss',
})
export class LogView implements OnDestroy {
    height = input<CSSStyleDeclaration['height']>('100%');
    value = input<string>();
    /** Shows the loading skeleton over the log while set. */
    loading = input(false);
    syntaxHighlighting = input<SyntaxHighlighting>('plaintext');
    readonly = input<boolean>(true);
    /** Overrides the highlighting level of the shared settings when set. */
    highlightLevel = input<LogHighlightLevel>();
    /** Name of the file the Download action saves the log as. */
    downloadFileName = input(DEFAULT_DOWNLOAD_FILE_NAME);
    /**
     * Where the keyboard shortcuts are heard: `self` while focus is inside the log view;
     * `document` also anywhere on the page outside text fields, overlays, dialogs and other
     * log views, as long as the log view is not inert.
     */
    shortcutScope = input<'self' | 'document'>('self');

    protected readonly extensions = computed(() => [
        ...BASE_EXTENSIONS,
        ...this.format().extensions,
        Prec.highest(EditorState.readOnly.of(this.readonly())),
        ...(this.lineWrapping() ? [EditorView.lineWrapping] : []),
        ...(this.loading() ? [BUSY_CONTENT] : []),
    ]);
    protected readonly skeletonSample = computed(() => this.format().skeletonSample);
    protected readonly canPrettifyJson = computed(
        () => this.format().jsonFragmentStart !== undefined,
    );
    protected readonly lineWrapping = computed(() => LOG_VIEW_SETTINGS.value().lineWrapping);
    protected readonly isJsonPrettified = computed(() => LOG_VIEW_SETTINGS.value().jsonPrettified);
    protected readonly isMaximized = signal(false);
    protected readonly isSettingsOpen = signal(false);
    protected readonly appliedHeight = computed(() =>
        this.isMaximized() ? FULLSCREEN_HEIGHT : this.height(),
    );
    /** Whether there is log text to copy or download. */
    protected readonly hasShownText = computed(() => !this.loading() && !!this.value());
    private readonly isMac = isMacPlatform(inject(DOCUMENT).defaultView?.navigator.userAgent ?? '');
    protected readonly shortcuts = describeLogViewShortcuts(this.isMac);

    private readonly codeEditor = viewChild<CodeEditor>('codeEditor');
    private readonly settingsButton = viewChild('settingsButton', { read: ElementRef<HTMLElement> });
    private readonly codeContainer = viewChild<ElementRef<HTMLElement>>('codeContainer');
    private readonly notificationService = inject(NotificationService);
    private readonly document = inject(DOCUMENT);
    private readonly host: HTMLElement = inject(ElementRef).nativeElement;
    private readonly format = computed<LogFormat>(() => LOG_FORMATS[this.syntaxHighlighting()]);
    private readonly toolbarActions: Record<LogViewAction, ToolbarAction> = {
        fullscreen: { run: () => this.toggleFullscreen() },
        lineWrap: { run: () => this.toggleLineWrapping() },
        copy: { run: () => this.copyToClipboard(), isAvailable: this.hasShownText },
        download: { run: () => this.download(), isAvailable: this.hasShownText },
        search: {
            run: () => {
                this.openSearch();
                this.alignBottom();
            },
            isAvailable: () => !this.loading(),
        },
        scrollToTop: { run: () => this.scrollToTop() },
        scrollToEnd: {
            run: () => {
                this.scrollToBottom();
                this.alignBottom();
            },
        },
        prettifyJson: { run: () => this.toggleJsonPrettified(), isAvailable: this.canPrettifyJson },
        settings: {
            run: () => (this.isSettingsOpen() ? this.closeSettings() : this.isSettingsOpen.set(true)),
        },
    };

    private readonly pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();
    private scrollFrame?: number;
    private renderedRaw?: string;
    private renderedFragmentStart?: RegExp;
    private completedRawLength = 0;
    private completedDocumentLength = 0;

    constructor() {
        effect(() => this.applyAppearance(this.host));
        effect(() =>
            applyLogHighlightLevel(
                this.host,
                this.highlightLevel() ?? LOG_VIEW_SETTINGS.value().highlightLevel,
            ),
        );
        afterRenderEffect(() => {
            const raw = this.value() ?? '';
            const fragmentStart = this.isJsonPrettified()
                ? this.format().jsonFragmentStart
                : undefined;
            const view = this.codeEditor()?.view;
            if (!view) return;
            untracked(() => this.syncDocument(view, raw, fragmentStart));
        });
        effect((onCleanup) => {
            if (!this.codeEditor()) return;
            let releaseScroller: (() => void) | undefined;
            const lookup = setTimeout(() => {
                releaseScroller = this.observeScroller();
            }, SCROLLER_LOOKUP_DELAY);
            onCleanup(() => {
                clearTimeout(lookup);
                releaseScroller?.();
            });
        });
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' && !event.defaultPrevented && this.isMaximized()) {
            this.toggleFullscreen();
        }
    }

    /** Runs the toolbar action of a shortcut pressed while focus is inside this log view. */
    @HostListener('keydown', ['$event'])
    handleShortcut(event: KeyboardEvent) {
        this.runShortcut(event);
    }

    /** Runs the toolbar action of a shortcut pressed elsewhere on the page, in the document scope. */
    @HostListener('document:keydown', ['$event'])
    handlePageShortcut(event: KeyboardEvent) {
        if (this.shortcutScope() !== 'document' || !this.isPageKeyForThisView(event)) return;
        this.runShortcut(event);
    }

    @HostListener('document:click', ['$event'])
    closeSettingsOnOutsideClick(event: MouseEvent) {
        const target = event.target;
        if (
            this.isSettingsOpen() &&
            target instanceof Element &&
            !target.closest('.log-settings-anchor, .cdk-overlay-container')
        ) {
            this.isSettingsOpen.set(false);
        }
    }

    runAction(action: LogViewAction) {
        this.toolbarActions[action].run();
    }

    toggleSettings() {
        this.isSettingsOpen.update((isOpen) => !isOpen);
    }

    closeSettings() {
        this.isSettingsOpen.set(false);
        this.settingsButton()?.nativeElement.focus();
    }

    /** Closes the open appearance settings on Escape pressed at their toggle button. */
    protected closeSettingsOnEscape(event: Event) {
        if (!this.isSettingsOpen()) return;
        event.preventDefault();
        this.closeSettings();
    }

    ngOnDestroy() {
        this.pendingTimeouts.forEach(clearTimeout);
        this.pendingTimeouts.clear();
        cancelAnimationFrame(this.scrollFrame ?? 0);
        this.document.body.classList.remove(FULLSCREEN_BODY_CLASS);
    }

    copyToClipboard() {
        from(navigator.clipboard.writeText(this.shownText())).subscribe({
            next: () => this.notificationService.emit('success', 'Log copied to clipboard'),
            error: () =>
                this.notificationService.emit(
                    'error',
                    'Copy to clipboard failed: the browser refused clipboard access',
                ),
        });
    }

    /** Saves the log as shown to a plain text file, without fetching it again. */
    download() {
        saveAs(
            new Blob([this.shownText()], { type: 'text/plain;charset=utf-8' }),
            this.downloadFileName(),
        );
    }

    toggleLineWrapping() {
        LOG_VIEW_SETTINGS.update({ lineWrapping: !this.lineWrapping() });
    }

    toggleJsonPrettified() {
        LOG_VIEW_SETTINGS.update({ jsonPrettified: !this.isJsonPrettified() });
    }

    alignBottom() {
        this.schedule(() => {
            const element = this.codeContainer()?.nativeElement;
            if (!element) return;

            if (element.getBoundingClientRect().bottom > window.innerHeight) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end',
                    inline: 'nearest',
                });

                this.schedule(() => {
                    window.scrollBy({
                        top: 48,
                        behavior: 'smooth',
                    });
                }, ALIGN_BOTTOM_DELAY);
            }
        }, ALIGN_BOTTOM_DELAY);
    }

    scrollToBottom() {
        this.releaseHeldLine();
        const el = this.getScrollerElement();
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }

    scrollToTop() {
        this.releaseHeldLine();
        const el = this.getScrollerElement();
        if (el) {
            el.scrollTop = 0;
        }
    }

    openSearch() {
        const view = this.codeEditor()?.view;
        if (view) {
            openSearchPanel(view);
        } else {
            this.notificationService.emit(
                'error',
                'No code viewer available to search',
            );
        }
    }

    toggleFullscreen() {
        this.isMaximized.set(!this.isMaximized());
        this.document.body.classList.toggle(FULLSCREEN_BODY_CLASS, this.isMaximized());
    }

    /**
     * Applies the stored colour preset, colour scheme and font to the host as custom
     * properties and the CSS colour scheme; the editor restyles without re-tokenizing.
     */
    private applyAppearance(host: HTMLElement) {
        const { presetId, fontFamily, fontSize, fontWeight } = LOG_VIEW_SETTINGS.value();
        const preset = LOG_PRESETS.find(({ id }) => id === presetId) ?? DEFAULT_LOG_PRESET;
        applyLogPalette(host, preset.palette);
        host.style.colorScheme = preset.scheme;
        host.style.setProperty('--log-font-family', `"${fontFamily}", "Courier New", monospace`);
        host.style.setProperty('--log-font-size', `${fontSize}px`);
        host.style.setProperty('--log-font-weight', `${fontWeight}`);
    }

    /**
     * Watches the scroller for size changes and keeps the view pinned to the bottom
     * when it was at the bottom before the change, else holds its top line.
     *
     * @returns A function that stops watching, or undefined when there is no scroller.
     */
    private observeScroller(): (() => void) | undefined {
        const scroller = this.getScrollerElement();
        if (!scroller) {
            console.warn('[LogView] Could not find .cm-scroller element');
            return undefined;
        }

        let wasNearBottom = this.isNearBottom();
        const onScroll = () => {
            wasNearBottom = this.isNearBottom();
        };
        scroller.addEventListener('scroll', onScroll);

        const resizeObserver = new ResizeObserver(() => {
            if (wasNearBottom || this.isNearBottom()) {
                this.scrollToBottom();
            } else {
                this.holdTopLine();
            }
            wasNearBottom = this.isNearBottom();
        });
        resizeObserver.observe(scroller);
        const releaseRevealObserver = this.pinOnReveal(scroller);

        return () => {
            scroller.removeEventListener('scroll', onScroll);
            resizeObserver.disconnect();
            releaseRevealObserver();
        };
    }

    /**
     * Brings the end of the log into view in the frame the scroller becomes visible,
     * when it was at the end, or never visible, before it was hidden. CodeMirror skips
     * measuring while the editor is clipped out of view, so the lines at the end are
     * rendered only once it is shown. A log hidden away from its end holds its top line.
     *
     * @returns A function that stops watching.
     */
    private pinOnReveal(scroller: HTMLElement): () => void {
        let wasVisible = false;
        let pinned = true;
        const intersectionObserver = new IntersectionObserver((entries) => {
            const isVisible = entries[entries.length - 1]?.isIntersecting ?? false;
            if (isVisible === wasVisible) return;
            if (isVisible && pinned) {
                this.scrollToEnd();
            } else if (!isVisible && wasVisible) {
                pinned = this.isNearBottom();
                if (!pinned) this.holdTopLine();
            }
            wasVisible = isVisible;
        });
        intersectionObserver.observe(scroller);
        return () => intersectionObserver.disconnect();
    }

    /** Scrolls the log's own scroller to the end and schedules the editor to render it. */
    private scrollToEnd() {
        const view = this.codeEditor()?.view;
        if (!view) return;
        this.scrollToBottom();
        view.requestMeasure();
    }

    /** Keeps the line last scrolled to at the top of the log until the person scrolls it. */
    private holdTopLine() {
        const view = this.codeEditor()?.view;
        if (view) holdReadingPosition(view);
    }

    /** Lets the log scroll away from a held top line. */
    private releaseHeldLine() {
        const view = this.codeEditor()?.view;
        if (view) releaseReadingPosition(view);
    }

    /** Runs the callback after the delay unless the component is destroyed first. */
    private schedule(callback: () => void, delay: number) {
        const timeout = setTimeout(() => {
            this.pendingTimeouts.delete(timeout);
            callback();
        }, delay);
        this.pendingTimeouts.add(timeout);
    }

    /** Scrolls to the bottom on the next frame, replacing a frame still pending. */
    private scrollToBottomOnNextFrame() {
        cancelAnimationFrame(this.scrollFrame ?? 0);
        this.scrollFrame = requestAnimationFrame(() => this.scrollToBottom());
    }

    /**
     * Brings the editor document in line with the raw value, whose line endings are
     * normalised to line feeds so stored offsets match the editor document. A value that extends the
     * previous one dispatches only its new part, starting at the last line the previous
     * value completed; any other change replaces the whole document.
     */
    private syncDocument(view: EditorView, value: string, fragmentStart: RegExp | undefined) {
        const raw = value.replace(LINE_ENDING, '\n');
        const previousRaw = this.renderedRaw;
        if (raw === previousRaw && fragmentStart === this.renderedFragmentStart) return;

        const isAppend =
            previousRaw !== undefined &&
            fragmentStart === this.renderedFragmentStart &&
            raw.startsWith(previousRaw);
        const documentFrom = isAppend ? this.completedDocumentLength : 0;
        const rawFrom = isAppend ? this.completedRawLength : 0;
        const completedRawEnd = raw.lastIndexOf('\n') + 1;
        const render = (text: string) =>
            fragmentStart ? formatJsonInText(text, fragmentStart) : text;
        const completedText = render(raw.slice(rawFrom, completedRawEnd));
        const pendingText = render(raw.slice(completedRawEnd));

        const wasNearBottom = this.isNearBottom() || view.state.doc.length === 0;
        view.dispatch({
            changes: {
                from: documentFrom,
                to: view.state.doc.length,
                insert: completedText + pendingText,
            },
        });

        this.renderedRaw = raw;
        this.renderedFragmentStart = fragmentStart;
        this.completedRawLength = completedRawEnd;
        this.completedDocumentLength = documentFrom + completedText.length;
        if (wasNearBottom) {
            this.scrollToBottomOnNextFrame();
        }
    }

    private runShortcut(event: KeyboardEvent) {
        const action = matchLogViewShortcut(event, this.isMac);
        if (!action || !this.isActionAvailable(action)) return;
        event.preventDefault();
        this.runAction(action);
    }

    /**
     * Whether a key pressed on the page belongs to this log view: pressed outside it, not into a
     * text field, overlay, dialog or another log view, while this log view is not inert.
     */
    private isPageKeyForThisView(event: KeyboardEvent): boolean {
        const target = event.target;
        if (event.defaultPrevented || this.host.closest('[inert]')) return false;
        if (!(target instanceof Element)) return true;
        return !this.host.contains(target) && !target.closest(ELSEWHERE_ENGAGED_SELECTOR);
    }

    private isActionAvailable(action: LogViewAction): boolean {
        return this.toolbarActions[action].isAvailable?.() ?? true;
    }

    /** Text of the log as the editor shows it: line feeds only, JSON prettified while that is on. */
    private shownText(): string {
        return this.codeEditor()?.view?.state.doc.toString() ?? '';
    }

    private getScrollerElement(): HTMLElement | null {
        return this.codeContainer()?.nativeElement.querySelector('.cm-scroller') ?? null;
    }

    private isNearBottom(): boolean {
        const el = this.getScrollerElement();
        if (!el) return false;
        return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_MARGIN;
    }
}
