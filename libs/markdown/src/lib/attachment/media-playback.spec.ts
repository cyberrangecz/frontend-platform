import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AttachmentDownload } from './attachment-download';
import { MediaPlayback } from './media-playback';

const MEDIA_LENGTH_SECONDS = 60;

function createElement(): HTMLVideoElement {
    const element = document.createElement('video');
    let readyState = 0;
    let currentTime = 0;
    Object.defineProperty(element, 'readyState', { get: () => readyState });
    Object.defineProperty(element, 'duration', { get: () => MEDIA_LENGTH_SECONDS });
    Object.defineProperty(element, 'currentTime', {
        get: () => currentTime,
        set: (value: number) => {
            if (readyState > 0) {
                currentTime = value;
            }
        },
    });
    Object.defineProperty(element, 'load', { value: () => undefined });
    Object.defineProperty(element, 'revealMetadata', {
        value: () => {
            readyState = 1;
            element.dispatchEvent(new Event('loadedmetadata'));
        },
    });
    return element;
}

function createPlayback(): { playback: MediaPlayback; element: HTMLVideoElement; reveal: () => void } {
    const download = { state: signal('loaded'), url: signal<string | null>('blob:local') };
    const element = createElement();
    const playback = TestBed.runInInjectionContext(() => new MediaPlayback(download as unknown as AttachmentDownload, () => undefined));
    playback.attach(element);
    TestBed.tick();
    return { playback, element, reveal: () => (element as unknown as { revealMetadata(): void }).revealMetadata() };
}

describe('MediaPlayback seeking before metadata', () => {
    it('fetches no media data until a downloaded file is attached', () => {
        const download = { state: signal('idle'), url: signal<string | null>(null) };
        const element = createElement();
        const playback = TestBed.runInInjectionContext(() => new MediaPlayback(download as unknown as AttachmentDownload, () => undefined));
        playback.attach(element);
        TestBed.tick();
        expect(element.preload).toBe('none');
        expect(element.hasAttribute('src')).toBe(false);
    });

    it('lets the element load metadata once the local file is the source', () => {
        const { element } = createPlayback();
        expect(element.preload).toBe('metadata');
        expect(element.getAttribute('src')).toBe('blob:local');
    });

    it('keeps a seek asked before metadata and applies it on loadedmetadata', () => {
        const { playback, element, reveal } = createPlayback();
        playback.seekTo(20);
        expect(playback.position()).toBe(20);
        expect(element.currentTime).toBe(0);
        reveal();
        expect(element.currentTime).toBe(20);
        expect(playback.position()).toBe(20);
    });

    it('applies only the latest of several seeks asked before metadata', () => {
        const { playback, element, reveal } = createPlayback();
        playback.seekTo(10);
        playback.seekTo(30);
        reveal();
        expect(element.currentTime).toBe(30);
    });

    it('clamps a pending seek to the length once known', () => {
        const { playback, element, reveal } = createPlayback();
        playback.seekTo(500);
        reveal();
        expect(element.currentTime).toBe(MEDIA_LENGTH_SECONDS);
    });

    it('seeks directly once metadata is known', () => {
        const { playback, element, reveal } = createPlayback();
        reveal();
        playback.seekTo(15);
        expect(element.currentTime).toBe(15);
    });
});
