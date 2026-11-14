import { createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OPEN_WINDOWS_TIMING, OpenWindow, OpenWindowsService } from './open-windows.service';

/** In-memory BroadcastChannel: a posted message reaches every other open channel of the name on `deliver()`. */
class FakeBroadcastChannel extends EventTarget {
    static readonly open = new Set<FakeBroadcastChannel>();
    static readonly queue: (() => void)[] = [];

    static deliver(): void {
        for (let next = this.queue.shift(); next; next = this.queue.shift()) {
            next();
        }
    }

    constructor(readonly name: string) {
        super();
        FakeBroadcastChannel.open.add(this);
    }

    postMessage(message: unknown): void {
        const copy = structuredClone(message);
        FakeBroadcastChannel.open.forEach((other) => {
            if (other !== this && other.name === this.name) {
                FakeBroadcastChannel.queue.push(() => other.dispatchEvent(new MessageEvent('message', { data: copy })));
            }
        });
    }

    close(): void {
        FakeBroadcastChannel.open.delete(this);
    }
}

type PeerMessage =
    | { kind: 'hello' | 'state'; window: Omit<OpenWindow, 'lastSeenAt'> }
    | { kind: 'goodbye'; id: string };

/** A window of another tab, driven message by message. */
class PeerTab {
    readonly channel = new FakeBroadcastChannel('crczp-open-windows');
    readonly received: PeerMessage[] = [];
    state: Omit<OpenWindow, 'lastSeenAt'>;

    constructor(changes: Partial<Omit<OpenWindow, 'lastSeenAt'>> = {}) {
        this.state = {
            id: 'peer',
            path: '/peer',
            title: 'Peer',
            openedAt: Date.now(),
            visible: true,
            focused: false,
            values: {},
            ...changes,
        };
        this.channel.addEventListener('message', (event) => this.received.push((event as MessageEvent<PeerMessage>).data));
    }

    send(kind: 'hello' | 'state' | 'goodbye', changes: Partial<Omit<OpenWindow, 'lastSeenAt'>> = {}): void {
        this.state = { ...this.state, ...changes };
        this.channel.postMessage(kind === 'goodbye' ? { kind, id: this.state.id } : { kind, window: this.state });
        FakeBroadcastChannel.deliver();
    }

    last(kind: PeerMessage['kind']): PeerMessage | undefined {
        return this.received.filter((message) => message.kind === kind).at(-1);
    }
}

describe('OpenWindowsService', () => {
    let service: OpenWindowsService;

    const create = (): OpenWindowsService => {
        const created = TestBed.inject(OpenWindowsService);
        FakeBroadcastChannel.deliver();
        return created;
    };
    const ids = (windows: readonly OpenWindow[]): string[] => windows.map((window) => window.id);

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-09T10:00:00Z'));
        vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
        TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
    });

    afterEach(() => {
        TestBed.resetTestingModule();
        FakeBroadcastChannel.open.clear();
        FakeBroadcastChannel.queue.length = 0;
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('announces itself and lists a window that answers the roll call', () => {
        vi.advanceTimersByTime(1_000);
        const peer = new PeerTab({ openedAt: Date.now() - 60_000 });
        service = create();

        expect(peer.last('hello')).toEqual({ kind: 'hello', window: expect.objectContaining({ id: service.self().id }) });
        peer.send('state');

        expect(ids(service.windows())).toEqual(['peer', service.self().id]);
    });

    it("answers a newcomer's roll call", () => {
        service = create();
        const peer = new PeerTab();

        peer.send('hello');

        expect(peer.last('state')).toEqual({ kind: 'state', window: expect.objectContaining({ id: service.self().id }) });
        expect(ids(service.windows())).toEqual([service.self().id, 'peer']);
    });

    it('two windows see each other and the values each publishes', () => {
        service = create();
        const secondTab = createEnvironmentInjector([OpenWindowsService], TestBed.inject(EnvironmentInjector));
        const second = secondTab.get(OpenWindowsService);
        FakeBroadcastChannel.deliver();

        service.setValue('shown', [7]);
        FakeBroadcastChannel.deliver();

        expect(ids(second.windows())).toEqual(ids(service.windows()));
        expect(second.windows().find((window) => window.id === service.self().id)?.values).toEqual({ shown: [7] });

        secondTab.destroy();
        FakeBroadcastChannel.deliver();
        expect(ids(service.windows())).toEqual([service.self().id]);
    });

    it('follows navigations and publishes the path without query or fragment', async () => {
        service = create();
        const peer = new PeerTab();

        await TestBed.inject(Router).navigateByUrl('/levels/3?tab=hints#top');
        FakeBroadcastChannel.deliver();

        expect(service.self().path).toBe('/levels/3');
        expect(peer.last('state')).toEqual({ kind: 'state', window: expect.objectContaining({ path: '/levels/3' }) });
    });

    it('lists the other windows on a path', () => {
        service = create();
        const peer = new PeerTab({ path: '/definitions/5' });
        peer.send('state');

        expect(ids(service.othersOn('/definitions/5'))).toEqual(['peer']);
        expect(service.othersOn(service.self().path)).toEqual([]);
    });

    it('publishes a value and withdraws it', () => {
        service = create();
        const peer = new PeerTab();

        service.setValue('selection', { ids: [1, 2], label: 'two' });
        FakeBroadcastChannel.deliver();
        expect(service.self().values).toEqual({ selection: { ids: [1, 2], label: 'two' } });
        expect(peer.last('state')).toEqual({ kind: 'state', window: expect.objectContaining({ values: service.self().values }) });

        service.removeValue('selection');
        FakeBroadcastChannel.deliver();
        expect(service.self().values).toEqual({});
        expect(peer.last('state')).toEqual({ kind: 'state', window: expect.objectContaining({ values: {} }) });
    });

    it('drops a window that says goodbye', () => {
        service = create();
        const peer = new PeerTab();
        peer.send('hello');

        peer.send('goodbye');

        expect(ids(service.windows())).toEqual([service.self().id]);
    });

    it('says goodbye when its page is hidden for good', () => {
        service = create();
        const peer = new PeerTab();

        window.dispatchEvent(new Event('pagehide'));
        FakeBroadcastChannel.deliver();

        expect(peer.last('goodbye')).toEqual({ kind: 'goodbye', id: service.self().id });
    });

    it('sends a heartbeat with its state', () => {
        service = create();
        const peer = new PeerTab();

        vi.advanceTimersByTime(OPEN_WINDOWS_TIMING.heartbeatMs);
        FakeBroadcastChannel.deliver();

        expect(peer.received.filter((message) => message.kind === 'state')).toHaveLength(1);
        expect(service.self().lastSeenAt).toBe(Date.now());
    });

    it('drops a visible window that misses its heartbeats', () => {
        service = create();
        new PeerTab({ visible: true }).send('hello');

        vi.advanceTimersByTime(OPEN_WINDOWS_TIMING.visibleTimeoutMs);
        expect(ids(service.windows())).toContain('peer');

        vi.advanceTimersByTime(OPEN_WINDOWS_TIMING.heartbeatMs);
        expect(ids(service.windows())).toEqual([service.self().id]);
    });

    it('keeps a silent hidden window until the hidden timeout', () => {
        service = create();
        new PeerTab({ visible: false }).send('hello');

        vi.advanceTimersByTime(OPEN_WINDOWS_TIMING.hiddenTimeoutMs);
        expect(ids(service.windows())).toContain('peer');

        vi.advanceTimersByTime(OPEN_WINDOWS_TIMING.heartbeatMs);
        expect(ids(service.windows())).toEqual([service.self().id]);
    });
});
