import { computed, DestroyRef, inject, Injectable, NgZone, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, fromEvent, interval, map, merge } from 'rxjs';

/** A value that survives JSON serialisation unchanged. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** One open tab or window of the app. Times are epoch milliseconds. */
export interface OpenWindow {
    /** Identifies the window for the life of its page; a reload starts a new window. */
    readonly id: string;
    /** Router path of the shown page, without query or fragment. */
    readonly path: string;
    readonly title: string;
    readonly openedAt: number;
    /** When the window was last heard from; for the own window, its last heartbeat. */
    readonly lastSeenAt: number;
    readonly visible: boolean;
    readonly focused: boolean;
    /** Values the window publishes to the others; only the window itself writes them. */
    readonly values: Readonly<Record<string, JsonValue>>;
}

/** Heartbeat period, and how long a silent window stays listed by its last reported visibility. */
export const OPEN_WINDOWS_TIMING = {
    heartbeatMs: 5_000,
    visibleTimeoutMs: 15_000,
    hiddenTimeoutMs: 150_000,
} as const;

type WindowState = Omit<OpenWindow, 'lastSeenAt'>;

type WindowMessage =
    | { readonly kind: 'hello'; readonly window: WindowState }
    | { readonly kind: 'state'; readonly window: WindowState }
    | { readonly kind: 'goodbye'; readonly id: string };

const CHANNEL_NAME = 'crczp-open-windows';

/**
 * Every open tab and window of the app on this origin, kept in sync over a BroadcastChannel. A
 * window announces itself on start and asks the others to answer, sends its state on every change
 * and heartbeat, and says goodbye when its page is hidden for good or the app is destroyed. A window
 * that stays silent past its timeout is dropped.
 */
@Injectable({ providedIn: 'root' })
export class OpenWindowsService {
    private readonly router = inject(Router);
    private readonly channel = new BroadcastChannel(CHANNEL_NAME);
    private readonly state = signal<WindowState>({
        id: crypto.randomUUID(),
        path: pathOf(this.router.url),
        title: document.title,
        openedAt: Date.now(),
        visible: document.visibilityState === 'visible',
        focused: document.hasFocus(),
        values: {},
    });
    private readonly heartbeatAt = signal(this.state().openedAt);
    private readonly others = signal<ReadonlyMap<string, OpenWindow>>(new Map());

    /** This window. */
    readonly self = computed<OpenWindow>(() => ({ ...this.state(), lastSeenAt: this.heartbeatAt() }));

    /** Every open window, this one included, oldest first; windows opened at the same time are ordered by id. */
    readonly windows = computed<readonly OpenWindow[]>(() => [this.self(), ...this.others().values()].sort(byAge));

    constructor() {
        const destroyRef = inject(DestroyRef);
        inject(NgZone).runOutsideAngular(() => {
            fromEvent<MessageEvent<WindowMessage>>(this.channel, 'message')
                .pipe(takeUntilDestroyed(destroyRef))
                .subscribe(({ data }) => this.receive(data));
            merge(
                this.router.events.pipe(
                    filter((event) => event instanceof NavigationEnd),
                    map((event) => ({ path: pathOf(event.urlAfterRedirects), title: document.title })),
                ),
                fromEvent(document, 'visibilitychange').pipe(map(() => ({ visible: document.visibilityState === 'visible' }))),
                fromEvent(window, 'focus').pipe(map(() => ({ focused: true }))),
                fromEvent(window, 'blur').pipe(map(() => ({ focused: false }))),
            )
                .pipe(takeUntilDestroyed(destroyRef))
                .subscribe((change) => this.change(change));
            interval(OPEN_WINDOWS_TIMING.heartbeatMs)
                .pipe(takeUntilDestroyed(destroyRef))
                .subscribe(() => this.heartbeat());
            fromEvent(window, 'pagehide')
                .pipe(takeUntilDestroyed(destroyRef))
                .subscribe(() => this.sayGoodbye());
        });
        destroyRef.onDestroy(() => {
            this.sayGoodbye();
            this.channel.close();
        });
        this.post({ kind: 'hello', window: this.state() });
    }

    /** The other windows showing the path, oldest first. */
    othersOn(path: string): readonly OpenWindow[] {
        const selfId = this.self().id;
        return this.windows().filter((window) => window.id !== selfId && window.path === path);
    }

    /** Publishes a value of this window under the key, replacing the one it held. */
    setValue(key: string, value: JsonValue): void {
        this.state.update((state) => ({ ...state, values: { ...state.values, [key]: value } }));
        this.post({ kind: 'state', window: this.state() });
    }

    /** Withdraws the value this window published under the key. */
    removeValue(key: string): void {
        if (!(key in this.state().values)) {
            return;
        }
        this.state.update(({ values: { [key]: _removed, ...values }, ...state }) => ({ ...state, values }));
        this.post({ kind: 'state', window: this.state() });
    }

    private change(change: Partial<Pick<WindowState, 'path' | 'title' | 'visible' | 'focused'>>): void {
        this.state.update((state) => ({ ...state, ...change }));
        this.post({ kind: 'state', window: this.state() });
    }

    private heartbeat(): void {
        const now = Date.now();
        this.heartbeatAt.set(now);
        this.others.update(
            (others) => new Map([...others].filter(([, window]) => now - window.lastSeenAt <= timeoutOf(window))),
        );
        this.change({ title: document.title });
    }

    private receive(message: WindowMessage): void {
        if (message.kind === 'goodbye') {
            this.others.update((others) => new Map([...others].filter(([id]) => id !== message.id)));
            return;
        }
        const window: OpenWindow = { ...message.window, lastSeenAt: Date.now() };
        this.others.update((others) => new Map(others).set(window.id, window));
        if (message.kind === 'hello') {
            this.post({ kind: 'state', window: this.state() });
        }
    }

    private sayGoodbye(): void {
        this.post({ kind: 'goodbye', id: this.state().id });
    }

    private post(message: WindowMessage): void {
        this.channel.postMessage(message);
    }
}

function pathOf(url: string): string {
    return url.split(/[?#]/, 1)[0] ?? url;
}

function timeoutOf(window: OpenWindow): number {
    return window.visible ? OPEN_WINDOWS_TIMING.visibleTimeoutMs : OPEN_WINDOWS_TIMING.hiddenTimeoutMs;
}

function byAge(first: OpenWindow, second: OpenWindow): number {
    return first.openedAt - second.openedAt || first.id.localeCompare(second.id);
}
