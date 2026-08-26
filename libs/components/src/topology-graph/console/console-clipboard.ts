import { DestroyRef, signal, Signal } from '@angular/core';
import { from } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const SHIFT_LEFT_KEYSYM = 0xffe1;
const UPPERCASE_V_KEYSYM = 0x56;
const LOWERCASE_V_KEYSYM = 0x76;

/**
 * Reports whether the host platform pastes with Command rather than Control. Read from the
 * deprecated platform string on purpose: the client hint that supersedes it is absent from every
 * browser on Apple systems, which is the one case this has to recognise.
 */
export function pastesWithCommandKey(): boolean {
    return /^Mac|^iP(hone|ad|od)/.test(navigator.platform);
}

/**
 * Queries the clipboard read permission, which the DOM typings do not enumerate among the
 * permission names even where a browser supports it.
 */
interface ClipboardPermissions {
    query(descriptor: { name: 'clipboard-read' }): Promise<PermissionStatus>;
}

/**
 * The remote session a clipboard strategy drives. Every member is read at call time, so the port
 * may be handed over before the session exists.
 */
export interface ConsoleClipboardSession {
    isGraphical(): boolean;

    isConnected(): boolean;

    sendClipboardText(text: string): void;

    sendKeyEvent(pressed: 0 | 1, keysym: number): void;
}

/**
 * Carries clipboard text between the host and the remote session. The direction out of the
 * session is shared by every strategy: the text is held until a host write succeeds, since a
 * browser may refuse the write for want of user activation and only accept a later retry.
 */
export abstract class ConsoleClipboardStrategy {
    protected lastSyncedText = '';
    private pendingOutboundText: string | null = null;
    private writeInFlight = false;

    protected constructor(
        protected readonly session: ConsoleClipboardSession,
        protected readonly destroyRef: DestroyRef,
    ) {}

    /** Starts observing the host clipboard while the console holds the keyboard. */
    abstract attach(): void;

    abstract detach(): void;

    /**
     * Reports whether the strategy claimed the keystroke, in which case the console neither
     * suppresses nor forwards it.
     */
    handleKeydown(_event: KeyboardEvent): boolean {
        return false;
    }

    handleKeyup(_event: KeyboardEvent): boolean {
        return false;
    }

    /** Takes clipboard text announced by the session and puts it on the host clipboard. */
    receiveFromSession(text: string): void {
        if (text === this.lastSyncedText) {
            return;
        }
        this.pendingOutboundText = text;
        this.flushOutbound();
    }

    /** Attempts the outstanding host write, if any. Safe to call on every console input event. */
    flushOutbound(): void {
        const pending = this.pendingOutboundText;
        if (pending === null || this.writeInFlight) {
            return;
        }

        this.writeInFlight = true;
        from(navigator.clipboard.writeText(pending))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.writeInFlight = false;
                    if (this.pendingOutboundText === pending) {
                        this.pendingOutboundText = null;
                    }
                    this.lastSyncedText = pending;
                },
                error: () => {
                    this.writeInFlight = false;
                },
            });
    }
}

/**
 * Mirrors the host clipboard into the session unprompted, for a browser that grants the page
 * clipboard reading of its own accord. No keystroke is claimed, so every key reaches the session
 * exactly as pressed.
 */
export class AutomaticClipboardStrategy extends ConsoleClipboardStrategy {
    private readonly clipboardChangeHandler = () => this.readHostClipboard();

    constructor(session: ConsoleClipboardSession, destroyRef: DestroyRef) {
        super(session, destroyRef);
    }

    attach(): void {
        this.readHostClipboard();

        if ('onclipboardchange' in navigator.clipboard) {
            navigator.clipboard.addEventListener(
                'clipboardchange',
                this.clipboardChangeHandler,
            );
        }
    }

    detach(): void {
        navigator.clipboard.removeEventListener(
            'clipboardchange',
            this.clipboardChangeHandler,
        );
    }

    /**
     * Reads the host clipboard and hands anything new to the session. The read needs the document
     * focused, so it is skipped rather than left to fail while focus is elsewhere.
     */
    private readHostClipboard(): void {
        if (!this.session.isConnected() || !document.hasFocus()) {
            return;
        }

        from(navigator.clipboard.readText())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (text) => {
                    if (text === this.lastSyncedText) {
                        return;
                    }
                    this.lastSyncedText = text;
                    this.session.sendClipboardText(text);
                },
                error: () => undefined,
            });
    }
}

/**
 * Obtains the host clipboard from the paste event alone, the only reading a browser grants
 * without a permission. The paste shortcut is therefore claimed: its own keystroke is withheld
 * and replayed once the text has reached the session, because the far end pastes whatever its
 * clipboard holds at the moment the key arrives.
 */
export class KeystrokeClipboardStrategy extends ConsoleClipboardStrategy {
    private pasteExpected = false;
    private readonly commandKeyPastes = pastesWithCommandKey();
    private readonly pasteHandler = (event: ClipboardEvent) =>
        this.handlePaste(event);

    constructor(session: ConsoleClipboardSession, destroyRef: DestroyRef) {
        super(session, destroyRef);
    }

    /**
     * Bound on the document rather than the console element, as the browser may dispatch the
     * paste to an unrelated element even while the console holds focus.
     */
    attach(): void {
        document.addEventListener('paste', this.pasteHandler, true);
    }

    detach(): void {
        document.removeEventListener('paste', this.pasteHandler, true);
        this.pasteExpected = false;
    }

    override handleKeydown(event: KeyboardEvent): boolean {
        if (!this.isReservedPasteCombo(event)) {
            return false;
        }

        if (event.shiftKey) {
            event.preventDefault();
            return true;
        }

        // Left unprevented so the browser raises its paste event, which replays the key.
        this.pasteExpected = true;
        return true;
    }

    override handleKeyup(event: KeyboardEvent): boolean {
        return this.isReservedPasteCombo(event);
    }

    /**
     * Claims the host platform's own paste shortcut in every mode, the only keystroke a browser
     * answers with a paste event. A terminal session additionally claims its shifted form, whose
     * far end reads a clipboard of its own that would otherwise diverge from the host one. A
     * graphical session leaves that form alone, since applications inside the guest paste with it
     * from the same guest clipboard this strategy populates.
     *
     * Every other combination over the V key, Control+V on an Apple platform included, is left to
     * reach the guest untouched.
     */
    private isReservedPasteCombo(event: KeyboardEvent): boolean {
        const pasteAcceleratorHeld = this.commandKeyPastes
            ? event.metaKey && !event.ctrlKey
            : event.ctrlKey && !event.metaKey;

        if (!this.isVKey(event) || !pasteAcceleratorHeld || event.altKey) {
            return false;
        }
        return this.session.isGraphical() ? !event.shiftKey : true;
    }

    /** Recognises the V key by label as well as by position, for a layout that moves it. */
    private isVKey(event: KeyboardEvent): boolean {
        return (
            event.code === 'KeyV' || event.key === 'v' || event.key === 'V'
        );
    }

    private handlePaste(event: ClipboardEvent): void {
        event.preventDefault();

        const replayPaste = this.pasteExpected;
        this.pasteExpected = false;

        if (!this.session.isConnected()) {
            return;
        }

        const text = event.clipboardData?.getData('text/plain') ?? '';
        this.flushOutbound();

        if (text.length > 0) {
            this.lastSyncedText = text;
            this.session.sendClipboardText(text);
        }

        if (replayPaste) {
            this.sendFarEndPaste();
        }
    }

    /**
     * Presses the paste shortcut the far end itself recognises, once its clipboard holds the
     * text: a graphical session takes Ctrl+V, while a terminal session rendered by the proxy
     * takes Ctrl+Shift+V and so needs the shift held around the keystroke. Ctrl arrives from the
     * user, who is still holding it.
     */
    private sendFarEndPaste(): void {
        if (this.session.isGraphical()) {
            this.session.sendKeyEvent(1, LOWERCASE_V_KEYSYM);
            this.session.sendKeyEvent(0, LOWERCASE_V_KEYSYM);
            return;
        }

        this.session.sendKeyEvent(1, SHIFT_LEFT_KEYSYM);
        this.session.sendKeyEvent(1, UPPERCASE_V_KEYSYM);
        this.session.sendKeyEvent(0, UPPERCASE_V_KEYSYM);
        this.session.sendKeyEvent(0, SHIFT_LEFT_KEYSYM);
    }
}

/**
 * Owns the console's clipboard behaviour and the choice between its two modes. The browser's
 * stance on reading the host clipboard decides the mode, and a later change of that stance swaps
 * the strategy underneath, so a permission granted mid-session takes effect at once.
 */
export class ConsoleClipboard {
    /** Reports whether the host clipboard reaches the session without a keystroke. */
    readonly automaticSyncActive: Signal<boolean>;

    private readonly automatic = signal(false);
    private strategy: ConsoleClipboardStrategy;
    private attached = false;
    private permissionStatus: PermissionStatus | null = null;

    constructor(
        private readonly session: ConsoleClipboardSession,
        private readonly destroyRef: DestroyRef,
    ) {
        this.automaticSyncActive = this.automatic.asReadonly();
        this.strategy = new KeystrokeClipboardStrategy(session, destroyRef);
        this.watchClipboardReadPermission();
    }

    attach(): void {
        if (this.attached) {
            return;
        }
        this.attached = true;
        this.strategy.attach();
    }

    detach(): void {
        if (!this.attached) {
            return;
        }
        this.attached = false;
        this.strategy.detach();
    }

    handleKeydown(event: KeyboardEvent): boolean {
        this.strategy.flushOutbound();
        return this.strategy.handleKeydown(event);
    }

    handleKeyup(event: KeyboardEvent): boolean {
        return this.strategy.handleKeyup(event);
    }

    /** Retries a refused host write on any console input carrying user activation. */
    retryPendingWrite(): void {
        this.strategy.flushOutbound();
    }

    receiveFromSession(text: string): void {
        this.strategy.receiveFromSession(text);
    }

    dispose(): void {
        this.detach();

        if (this.permissionStatus) {
            this.permissionStatus.onchange = null;
            this.permissionStatus = null;
        }
    }

    /**
     * Follows the browser's stance on clipboard reading, now and whenever it later changes. Only
     * a browser exposing the clipboard read permission can report a grant; elsewhere the query
     * rejects and the keystroke-driven mode stands.
     */
    private watchClipboardReadPermission(): void {
        if (!navigator.permissions || !navigator.clipboard?.readText) {
            return;
        }

        const permissions =
            navigator.permissions as unknown as ClipboardPermissions;

        let query: Promise<PermissionStatus>;
        try {
            query = permissions.query({ name: 'clipboard-read' });
        } catch {
            return;
        }

        from(query)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (status) => {
                    this.permissionStatus = status;
                    status.onchange = () =>
                        this.useAutomaticMode(status.state === 'granted');
                    this.useAutomaticMode(status.state === 'granted');
                },
                error: () => undefined,
            });
    }

    private useAutomaticMode(automatic: boolean): void {
        if (automatic === this.automatic()) {
            return;
        }

        const wasAttached = this.attached;
        this.detach();

        this.automatic.set(automatic);
        this.strategy = automatic
            ? new AutomaticClipboardStrategy(this.session, this.destroyRef)
            : new KeystrokeClipboardStrategy(this.session, this.destroyRef);

        if (wasAttached) {
            this.attach();
        }
    }
}
