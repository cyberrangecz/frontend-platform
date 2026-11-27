import { ApplicationRef, ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PortalConfig } from '@crczp/utils';
import { provideTestPortalConfig } from '@crczp/test-utils';
import { Observable, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AttachmentDownload } from './attachment-download';
import { AttachmentDownloadQueue } from './attachment-download-queue';
import { AttachmentDownloadEvent, AttachmentSource } from './attachment-source';

const SMALL = 10;

class FakeSource extends AttachmentSource {
    readonly started: string[] = [];
    readonly transfers = new Map<string, Subject<AttachmentDownloadEvent>>();
    held = new Set<string>();

    metadata() {
        return new Subject<undefined>();
    }
    download(hash: string): Observable<AttachmentDownloadEvent> {
        this.started.push(hash);
        const transfer = new Subject<AttachmentDownloadEvent>();
        this.transfers.set(hash, transfer);
        return transfer;
    }
    poster() {
        return new Subject<undefined>();
    }
    isPending(hash: string): boolean {
        return this.held.has(hash);
    }
    finish(hash: string): void {
        this.transfers.get(hash)?.next({ type: 'done', url: `blob:${hash}` });
    }
}

describe('attachment download queue', () => {
    let source: FakeSource;
    let container: HTMLElement;

    beforeEach(() => {
        source = new FakeSource();
        container = document.createElement('div');
        document.body.append(container);
        TestBed.configureTestingModule({
            providers: [provideTestPortalConfig(), { provide: AttachmentSource, useValue: source }],
        });
        expect(TestBed.inject(PortalConfig)).toBeTruthy();
    });

    afterEach(() => container.remove());

    function card(hash: string, position?: HTMLElement): AttachmentDownload {
        const element = document.createElement('div');
        if (position) {
            container.insertBefore(element, position);
        } else {
            container.append(element);
        }
        const injector = Injector.create({
            parent: TestBed.inject(Injector),
            providers: [{ provide: ElementRef, useValue: new ElementRef(element) }],
        });
        const download = runInInjectionContext(injector, () => new AttachmentDownload(() => hash));
        download.startIfSmall(SMALL);
        return download;
    }

    function settle(): void {
        TestBed.inject(ApplicationRef).tick();
    }

    it('downloads one file at a time in document order', () => {
        const first = card('a');
        card('b');
        card('c');
        settle();
        expect(source.started).toEqual(['a']);

        source.finish('a');
        settle();
        expect(source.started).toEqual(['a', 'b']);
        expect(first.state()).toBe('loaded');

        source.finish('b');
        settle();
        expect(source.started).toEqual(['a', 'b', 'c']);
    });

    it('serves a card inserted above the waiting ones before them', () => {
        card('a');
        const waiting = card('b');
        settle();
        const waitingElement = container.children[1] as HTMLElement;
        card('top', waitingElement);
        settle();
        source.finish('a');
        settle();
        expect(source.started).toEqual(['a', 'top']);
        expect(waiting.state()).toBe('idle');
    });

    it('skips a card that was removed while waiting', () => {
        card('a');
        const waiting = card('b');
        card('c');
        settle();
        TestBed.inject(AttachmentDownloadQueue).remove(waiting);
        source.finish('a');
        settle();
        expect(source.started).toEqual(['a', 'c']);
        expect(waiting.state()).toBe('idle');
    });

    it('starts a file that is already held at once, outside the queue', () => {
        card('a');
        source.held.add('held');
        const held = card('held');
        settle();
        expect(source.started).toEqual(['held', 'a']);
        expect(held.state()).toBe('loading');
    });

    it('lets a click start a waiting card at once, and the queue waits for it', () => {
        card('a');
        const second = card('b');
        card('c');
        settle();
        second.start();
        source.finish('a');
        settle();
        expect(source.started).toEqual(['a', 'b']);
        source.finish('b');
        settle();
        expect(source.started).toEqual(['a', 'b', 'c']);
    });

    it('ends the loading state of a transfer that completes without a file and serves the next card', () => {
        const first = card('a');
        card('b');
        settle();
        source.transfers.get('a')?.complete();
        settle();
        expect(first.state()).toBe('error');
        expect(source.started).toEqual(['a', 'b']);
    });

    it('queues a download once however often it asks', () => {
        const first = card('a');
        first.startIfSmall(SMALL);
        settle();
        source.transfers.get('a')?.complete();
        settle();
        expect(source.started).toEqual(['a']);
    });
});
