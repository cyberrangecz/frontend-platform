import { computed, createEnvironmentInjector, EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { JsonValue, OpenWindow, OpenWindowsService } from '@crczp/utils';
import { SentinelAuthService } from '@sentinel/auth';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORED_ATTACHMENT_DEFINITIONS_KEY } from './attachment-byte-store.service';
import { ATTACHMENT_EVICTION_GRACE_MS, AttachmentStoreEviction } from './attachment-store-eviction.service';
import { AttachmentUrlCache } from './attachment-url-cache.service';

/** The open windows of every simulated tab; a tab sees all of them and writes only its own values. */
class OpenWindowsWorld {
    readonly all = signal<readonly OpenWindow[]>([]);

    open(id: string): OpenWindowsService {
        const now = Date.now();
        this.all.update((windows) => [
            ...windows,
            { id, path: '/', title: '', openedAt: now, lastSeenAt: now, visible: true, focused: true, values: {} },
        ]);
        const windows = computed(() => [...this.all()].sort((first, second) => first.openedAt - second.openedAt));
        const own = computed(() => this.all().find((window) => window.id === id));
        return {
            windows,
            self: computed(() => own() ?? ({ id } as OpenWindow)),
            othersOn: () => [],
            setValue: (key: string, value: JsonValue) =>
                this.all.update((all) =>
                    all.map((window) => (window.id === id ? { ...window, values: { ...window.values, [key]: value } } : window)),
                ),
            removeValue: () => undefined,
        } as unknown as OpenWindowsService;
    }

    /** Drops the window, as a goodbye or a missed timeout does. */
    drop(id: string): void {
        this.all.update((windows) => windows.filter((window) => window.id !== id));
    }

    heartbeat(): void {
        this.all.update((windows) => windows.map((window) => ({ ...window, lastSeenAt: Date.now() })));
    }

    listed(id: string): JsonValue | undefined {
        return this.all().find((window) => window.id === id)?.values[STORED_ATTACHMENT_DEFINITIONS_KEY];
    }
}

/** In-memory Cache Storage shared by every simulated tab. */
class FakeCacheStorage {
    readonly stores = new Map<string, Map<string, FakeResponse>>();

    match(path: string, options: { cacheName: string }): Promise<FakeResponse | undefined> {
        return Promise.resolve(this.stores.get(options.cacheName)?.get(path));
    }

    open(name: string): Promise<unknown> {
        const entries = this.stores.get(name) ?? new Map<string, FakeResponse>();
        this.stores.set(name, entries);
        return Promise.resolve({
            put: (path: string, response: FakeResponse) => Promise.resolve(void entries.set(path, response)),
            keys: () => Promise.resolve([...entries.keys()].map((path) => ({ url: `https://platform.test${path}` }))),
        });
    }

    has(name: string): Promise<boolean> {
        return Promise.resolve(this.stores.has(name));
    }

    keys(): Promise<string[]> {
        return Promise.resolve([...this.stores.keys()]);
    }

    delete(name: string): Promise<boolean> {
        return Promise.resolve(this.stores.delete(name));
    }
}

/** The signed-in user the byte store scopes its caches by. */
class FakeAuthentication {
    readonly activeUser$ = new BehaviorSubject<{ id: number } | undefined>({ id: 5 });

    getActiveUser(): { id: number } | undefined {
        return this.activeUser$.value;
    }
}

class FakeResponse {
    constructor(private readonly body: Blob) {}

    blob(): Promise<Blob> {
        return Promise.resolve(this.body);
    }
}

describe('AttachmentUrlCache', () => {
    const definitionId = 7;
    let world: OpenWindowsWorld;
    let authentication: FakeAuthentication;
    let created: number;
    let revoked: string[];

    const load = (): (() => Observable<Blob>) => () => of(new Blob(['x']));

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        world = new OpenWindowsWorld();
        authentication = new FakeAuthentication();
        created = 0;
        revoked = [];
        vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++created}`);
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => void revoked.push(url));
    });

    afterEach(() => {
        TestBed.resetTestingModule();
        vi.unstubAllGlobals();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('in one tab', () => {
        let cache: AttachmentUrlCache;

        const resolveFile = (id = definitionId): string => {
            let url = '';
            cache.resolve(id, 'file', 'hash', load()).subscribe((value) => (url = value ?? ''));
            return url;
        };

        beforeEach(() => {
            TestBed.configureTestingModule({ providers: [
                    { provide: OpenWindowsService, useValue: world.open('tab') },
                    { provide: SentinelAuthService, useValue: authentication },
                ], });
            cache = TestBed.inject(AttachmentUrlCache);
        });

        it('revokes the URLs when the last holder ends', () => {
            const end = cache.hold(definitionId);
            const url = resolveFile();

            end();
            expect(revoked).toEqual([]);
            vi.runAllTimers();

            expect(revoked).toEqual([url]);
            expect(cache.has(definitionId, 'file', 'hash')).toBe(false);
        });

        it('keeps the URLs while another holder lives', () => {
            const endFirst = cache.hold(definitionId);
            const endSecond = cache.hold(definitionId);
            const url = resolveFile();

            endFirst();
            vi.runAllTimers();
            expect(revoked).toEqual([]);
            expect(resolveFile()).toBe(url);

            endSecond();
            vi.runAllTimers();
            expect(revoked).toEqual([url]);
        });

        it('keeps the URLs when the next page of the definition is held before the old one ends', () => {
            const endOldPage = cache.hold(definitionId);
            const url = resolveFile();

            endOldPage();
            cache.hold(definitionId);
            vi.runAllTimers();

            expect(revoked).toEqual([]);
            expect(resolveFile()).toBe(url);
        });

        it('keeps the URLs when the next page is held after the old one ended in the same task', () => {
            const endOldPage = cache.hold(definitionId);
            const url = resolveFile();

            endOldPage();
            cache.hold(definitionId);

            expect(resolveFile()).toBe(url);
            expect(created).toBe(1);
        });

        it('downloads again after release', () => {
            cache.hold(definitionId)();
            vi.runAllTimers();
            cache.hold(definitionId);

            expect(resolveFile()).toBe('blob:1');
            expect(created).toBe(1);
        });

        it('ends a hold only once', () => {
            const end = cache.hold(definitionId);
            cache.hold(definitionId);
            resolveFile();

            end();
            end();
            vi.runAllTimers();

            expect(revoked).toEqual([]);
        });

        it('leaves another definition untouched', () => {
            const endFirst = cache.hold(definitionId);
            cache.hold(definitionId + 1);
            resolveFile(definitionId + 1);

            endFirst();
            vi.runAllTimers();

            expect(cache.has(definitionId + 1, 'file', 'hash')).toBe(true);
        });

        it('revokes a blob that arrives after its definition was released', () => {
            const url = resolveFile();

            expect(revoked).toEqual([url]);
            expect(cache.has(definitionId, 'file', 'hash')).toBe(false);
        });

        it('remembers a file without a poster while its definition is held', () => {
            const end = cache.hold(definitionId);
            expect(cache.lacksPoster(definitionId, 'hash')).toBe(false);

            cache.notePosterAbsent(definitionId, 'hash');

            expect(cache.lacksPoster(definitionId, 'hash')).toBe(true);
            expect(cache.lacksPoster(definitionId, 'other')).toBe(false);
            end();
            vi.runAllTimers();
            expect(cache.lacksPoster(definitionId, 'hash')).toBe(false);
        });

        it('publishes the held definitions to the open windows until their release', () => {
            const end = cache.hold(definitionId);
            expect(world.listed('tab')).toEqual([definitionId]);

            end();
            vi.runAllTimers();
            expect(world.listed('tab')).toEqual([]);
        });
    });

    describe('over the store every tab shares', () => {
        let storage: FakeCacheStorage;
        const tabs = new Map<string, EnvironmentInjector>();

        const openTab = (id: string): AttachmentUrlCache => {
            const injector = createEnvironmentInjector(
                [
                    AttachmentUrlCache,
                    AttachmentStoreEviction,
                    { provide: OpenWindowsService, useValue: world.open(id) },
                    { provide: SentinelAuthService, useValue: authentication },
                ],
                TestBed.inject(EnvironmentInjector),
            );
            tabs.set(id, injector);
            return injector.get(AttachmentUrlCache);
        };
        /** Ends the tab's page without releasing anything, as closing or crashing it does. */
        const closeTab = (id: string): void => {
            tabs.get(id)?.destroy();
            tabs.delete(id);
            world.drop(id);
        };
        const settle = async (): Promise<void> => {
            for (let round = 0; round < 3; round++) {
                TestBed.tick();
                await new Promise<void>((resolve) => setImmediate(resolve));
            }
        };
        /** Lets time pass with heartbeats, so the oldest window sweeps on the way. */
        const pass = async (milliseconds: number): Promise<void> => {
            vi.advanceTimersByTime(milliseconds);
            world.heartbeat();
            await settle();
        };
        const resolveFile = (cache: AttachmentUrlCache, loader = vi.fn(load())): ReturnType<typeof vi.fn> => {
            cache.resolve(definitionId, 'file', 'hash', loader).subscribe();
            return loader;
        };
        const isStored = (): boolean => storage.stores.has(`crczp-attachments-5.${definitionId}`);

        beforeEach(() => {
            storage = new FakeCacheStorage();
            vi.stubGlobal('caches', storage);
            vi.stubGlobal('Response', FakeResponse);
            TestBed.configureTestingModule({ providers: [{ provide: SentinelAuthService, useValue: authentication }] });
        });

        afterEach(() => {
            tabs.forEach((injector) => injector.destroy());
            tabs.clear();
        });

        it('reuses the stored bytes after a reload without downloading', async () => {
            const first = openTab('first');
            first.hold(definitionId);
            const firstLoader = resolveFile(first);
            await settle();
            expect(firstLoader).toHaveBeenCalledOnce();

            closeTab('first');
            const reloaded = openTab('reloaded');
            reloaded.hold(definitionId);
            const loader = resolveFile(reloaded);
            await settle();

            expect(loader).not.toHaveBeenCalled();
            expect(created).toBe(2);
        });

        it('lets a second tab read the bytes the first one stored', async () => {
            const first = openTab('first');
            first.hold(definitionId);
            resolveFile(first);
            await settle();

            const second = openTab('second');
            second.hold(definitionId);
            await settle();

            expect(second.has(definitionId, 'file', 'hash')).toBe(true);
            const secondLoader = resolveFile(second);
            await settle();
            expect(secondLoader).not.toHaveBeenCalled();
            expect(created).toBe(2);
        });

        it('evicts a definition once no open tab has listed it for the grace period', async () => {
            const first = openTab('first');
            const endFirst = first.hold(definitionId);
            resolveFile(first);
            vi.advanceTimersByTime(1);
            openTab('second');
            await settle();

            endFirst();
            vi.runAllTimers();
            closeTab('first');
            await settle();
            expect(isStored()).toBe(true);

            await pass(ATTACHMENT_EVICTION_GRACE_MS - 1);
            expect(isStored()).toBe(true);

            await pass(1);
            expect(isStored()).toBe(false);
        });

        it('keeps the bytes while another tab lists the definition', async () => {
            const first = openTab('first');
            first.hold(definitionId);
            resolveFile(first);
            vi.advanceTimersByTime(1);
            openTab('second').hold(definitionId);
            await settle();

            closeTab('first');
            await pass(ATTACHMENT_EVICTION_GRACE_MS);
            await pass(ATTACHMENT_EVICTION_GRACE_MS);

            expect(isStored()).toBe(true);
        });

        it("evicts a crashed tab's definitions once its window timed out", async () => {
            openTab('survivor');
            vi.advanceTimersByTime(1);
            const crashing = openTab('crashing');
            crashing.hold(definitionId);
            resolveFile(crashing);
            await settle();

            await pass(ATTACHMENT_EVICTION_GRACE_MS);
            expect(isStored()).toBe(true);

            closeTab('crashing');
            await pass(0);
            await pass(ATTACHMENT_EVICTION_GRACE_MS);
            expect(isStored()).toBe(false);
        });

        it('leaves eviction to the oldest window', async () => {
            openTab('oldest');
            vi.advanceTimersByTime(1);
            openTab('younger');
            const closing = openTab('closing');
            closing.hold(definitionId);
            resolveFile(closing);
            await settle();
            const evictions = vi.spyOn(storage, 'delete');

            closeTab('closing');
            await pass(0);
            await pass(ATTACHMENT_EVICTION_GRACE_MS);

            expect(isStored()).toBe(false);
            expect(evictions).toHaveBeenCalledOnce();
        });

        it('names the caches by the signed-in user', async () => {
            const tab = openTab('tab');
            tab.hold(definitionId);
            resolveFile(tab);
            await settle();

            expect([...storage.stores.keys()]).toEqual([`crczp-attachments-5.${definitionId}`]);
        });

        it("does not read another user's stored bytes", async () => {
            const first = openTab('first');
            first.hold(definitionId);
            resolveFile(first);
            await settle();
            closeTab('first');

            authentication.activeUser$.next({ id: 6 });
            const other = openTab('other');
            other.hold(definitionId);
            const loader = resolveFile(other);
            await settle();

            expect(loader).toHaveBeenCalledOnce();
            expect(storage.stores.has(`crczp-attachments-6.${definitionId}`)).toBe(true);
        });

        it("evicts only the signed-in user's unlisted caches", async () => {
            storage.stores.set(`crczp-attachments-6.${definitionId}`, new Map());
            const tab = openTab('tab');
            tab.hold(definitionId);
            resolveFile(tab);
            await settle();
            tab.hold(definitionId + 1)();
            vi.runAllTimers();
            await pass(0);
            await pass(ATTACHMENT_EVICTION_GRACE_MS);

            expect(storage.stores.has(`crczp-attachments-6.${definitionId}`)).toBe(true);
        });

        it('deletes the caches named without a user once at creation', async () => {
            storage.stores.set(`crczp-attachments-${definitionId}`, new Map());
            storage.stores.set('unrelated', new Map());

            openTab('tab');
            await settle();

            expect([...storage.stores.keys()]).toEqual(['unrelated']);
        });

        it('deletes every stored attachment cache when the user signs out', async () => {
            storage.stores.set(`crczp-attachments-6.${definitionId}`, new Map());
            storage.stores.set('unrelated', new Map());
            const tab = openTab('tab');
            tab.hold(definitionId);
            resolveFile(tab);
            await settle();

            authentication.activeUser$.next(undefined);
            await settle();

            expect([...storage.stores.keys()]).toEqual(['unrelated']);
        });
    });
});
