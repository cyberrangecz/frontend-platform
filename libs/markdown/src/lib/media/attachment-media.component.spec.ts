import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentMetadata, AttachmentSource } from '../attachment/attachment-source';
import { MediaSizeLimits } from './media-size-limits';
import { AttachmentMediaComponent } from './attachment-media.component';
import { ATTACHMENT_CARDS } from './attachment-cards';
import { MediaItemActions } from './media-item-actions';
import { reportSizableCard, SizableCard } from './sizable-card-slot';

const METADATA: AttachmentMetadata = { hash: 'hash', fileName: 'clip.mp4', mediaType: 'video/mp4', size: 10, width: 1000, height: 500 };
const LIMITS: MediaSizeLimits = { minimum: 352, maximum: 2000 };

@Component({ selector: 'crczp-stub-sizable-card', template: '' })
class StubSizableCardComponent implements SizableCard {
    readonly metadata = input<AttachmentMetadata>();
    readonly label = input('');
    readonly maxWidth = input<number>();
    readonly sizeLimits = signal<MediaSizeLimits | null>(LIMITS);
    readonly shownWidth = signal<number | null>(480);

    constructor() {
        reportSizableCard(this);
    }
}

describe('AttachmentMediaComponent resize handle', () => {
    let fixture: ComponentFixture<AttachmentMediaComponent>;

    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
        TestBed.configureTestingModule({
            providers: [
                { provide: ATTACHMENT_CARDS, useValue: { video: { component: StubSizableCardComponent, resizable: true } } },
                { provide: AttachmentSource, useValue: { metadata: () => of(METADATA), isPending: () => false } },
                { provide: MediaItemActions, useValue: {} },
            ],
        });
        fixture = TestBed.createComponent(AttachmentMediaComponent);
        fixture.componentRef.setInput('reference', { hash: 'hash', label: '' });
        fixture.detectChanges();
        fixture.detectChanges();
    });

    afterEach(() => vi.unstubAllGlobals());

    it('announces the card limits and width on the handle once the card exists', () => {
        const handle = fixture.nativeElement.querySelector('crczp-media-resize-handle') as HTMLElement;

        expect(handle.getAttribute('aria-valuemin')).toBe('352');
        expect(handle.getAttribute('aria-valuemax')).toBe('2000');
        expect(handle.getAttribute('aria-valuenow')).toBe('480');
    });

    it('applies the card minimum as the frame minimum width', () => {
        const frame = fixture.nativeElement.querySelector('.attachment-frame') as HTMLElement;

        expect(frame.style.minWidth).toBe('352px');
    });
});

describe('AttachmentMediaComponent typed width', () => {
    const COLUMN_WIDTH = 600;
    const SCROLLBAR_WIDTH = 10;
    let fixture: ComponentFixture<AttachmentMediaComponent>;
    let resize: ReturnType<typeof vi.fn>;

    function render(maxWidth?: number): void {
        fixture = TestBed.createComponent(AttachmentMediaComponent);
        const host = fixture.nativeElement as HTMLElement;
        Object.defineProperty(host, 'clientWidth', { value: COLUMN_WIDTH });
        Object.defineProperty(host, 'offsetWidth', { value: COLUMN_WIDTH + SCROLLBAR_WIDTH });
        Object.defineProperty(host, 'offsetHeight', { value: 300 });
        fixture.componentRef.setInput('reference', { hash: 'hash', label: '', ...(maxWidth ? { maxWidth } : {}) });
        fixture.detectChanges();
        fixture.detectChanges();
    }

    const readout = (): HTMLElement | null => (fixture.nativeElement as HTMLElement).querySelector('.size-readout');
    const readoutButton = (): HTMLButtonElement | null =>
        (fixture.nativeElement as HTMLElement).querySelector('button.size-readout-content');

    function typeWidth(value: string): void {
        readoutButton()?.click();
        fixture.detectChanges();
        const field = (fixture.nativeElement as HTMLElement).querySelector('input.size-readout-number') as HTMLInputElement;
        field.value = value;
        field.dispatchEvent(new Event('input'));
        field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        fixture.detectChanges();
    }

    beforeEach(() => {
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(private readonly report: () => void) {}
                observe(): void {
                    this.report();
                }
                disconnect(): void {}
            },
        );
        resize = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: ATTACHMENT_CARDS, useValue: { video: { component: StubSizableCardComponent, resizable: true } } },
                { provide: AttachmentSource, useValue: { metadata: () => of(METADATA), isPending: () => false } },
                { provide: MediaItemActions, useValue: { resize } },
            ],
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('caps a drag at the column but saves a typed width up to the card maximum', () => {
        render(480);
        const handle = fixture.nativeElement.querySelector('crczp-media-resize-handle') as HTMLElement;
        expect(handle.getAttribute('aria-valuemax')).toBe(String(COLUMN_WIDTH));

        typeWidth('1500');

        expect(resize).toHaveBeenCalledWith(expect.objectContaining({ maxWidth: 480 }), 1500);
    });

    it('caps a drag at the column width without the scrollbar the column draws', () => {
        render();
        const handle = fixture.nativeElement.querySelector('crczp-media-resize-handle') as HTMLElement;
        expect(handle.getAttribute('aria-valuemax')).toBe(String(COLUMN_WIDTH));
        expect(Number(handle.getAttribute('aria-valuemax'))).toBeLessThan(COLUMN_WIDTH + SCROLLBAR_WIDTH);
    });

    it('removes the saved width when the field is saved empty', () => {
        render(480);

        typeWidth('');

        expect(resize).toHaveBeenCalledWith(expect.objectContaining({ maxWidth: 480 }), undefined);
    });

    it('shows the width the card is shown at in the readout before any drag', () => {
        render(480);

        expect(readout()?.textContent?.replace(/\s+/g, '')).toBe('480px');
    });

    it('shows the dragged width in the readout while a resize is in progress', () => {
        render(480);
        const handle = fixture.nativeElement.querySelector('crczp-media-resize-handle') as HTMLElement;
        const control = fixture.nativeElement.querySelector('crczp-media-size-control') as HTMLElement;

        handle.dispatchEvent(new FocusEvent('focus'));
        handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
        fixture.detectChanges();

        expect(readoutButton()?.textContent).toContain(String(COLUMN_WIDTH));
        expect(control.classList).toContain('size-control--resizing');
    });

    it('writes nothing for an unchanged width and keeps focus on the readout', async () => {
        render(480);

        typeWidth('480');
        await fixture.whenStable();

        expect(resize).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(readoutButton());
    });

    it('writes nothing for an unchanged width while the saved width lies outside the limits', () => {
        render(5000);

        typeWidth('480');

        expect(resize).not.toHaveBeenCalled();
    });
});

describe('AttachmentMediaComponent layout from the shown size', () => {
    const NEEDED = { width: 160, height: 112 };
    const GIF: AttachmentMetadata = { hash: 'hash', fileName: 'loop.gif', mediaType: 'image/gif', size: 10, width: 480, height: 270 };
    let shown: { width: number; height: number };

    function frameOf(size: { width: number; height: number }): HTMLElement {
        shown = size;
        const fixture = TestBed.createComponent(AttachmentMediaComponent);
        fixture.componentRef.setInput('reference', { hash: 'hash', label: '' });
        fixture.detectChanges();
        fixture.detectChanges();
        fixture.detectChanges();
        return fixture.nativeElement.querySelector('.attachment-frame') as HTMLElement;
    }

    beforeEach(() => {
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(private readonly report: () => void) {}
                observe(): void {
                    this.report();
                }
                disconnect(): void {}
            },
        );
        const sizeOf = (element: HTMLElement): { width: number; height: number } =>
            element.classList.contains('attachment-inset-probe') ? NEEDED : shown;
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
            return sizeOf(this).width;
        });
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
            return sizeOf(this).height;
        });
        TestBed.configureTestingModule({
            providers: [
                { provide: ATTACHMENT_CARDS, useValue: { image: { component: StubSizableCardComponent, resizable: true, layout: { inset: 'when-fits' } } } },
                { provide: AttachmentSource, useValue: { metadata: () => of(GIF), isPending: () => false } },
                { provide: MediaItemActions, useValue: {} },
            ],
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('puts the handle outside the corner of a picture shown small, whatever its natural size', () => {
        expect(frameOf({ width: 166, height: 93 }).classList).not.toContain('attachment-frame--inset');
    });

    it('puts the handle outside the corner of a picture shown wide but too short', () => {
        expect(frameOf({ width: 640, height: 111 }).classList).not.toContain('attachment-frame--inset');
    });

    it('keeps the handle inside a picture shown large', () => {
        expect(frameOf({ width: 480, height: 270 }).classList).toContain('attachment-frame--inset');
    });
});

describe('AttachmentMediaComponent in a locked editor', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('shows no size controls without media item actions', () => {
        vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
        TestBed.configureTestingModule({
            providers: [
                { provide: ATTACHMENT_CARDS, useValue: { video: { component: StubSizableCardComponent, resizable: true } } },
                { provide: AttachmentSource, useValue: { metadata: () => of(METADATA), isPending: () => false } },
            ],
        });
        const fixture = TestBed.createComponent(AttachmentMediaComponent);
        fixture.componentRef.setInput('reference', { hash: 'hash', label: '', maxWidth: 480 });
        fixture.detectChanges();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('crczp-media-size-control')).toBeNull();
        expect(fixture.nativeElement.querySelector('crczp-media-resize-handle')).toBeNull();
    });
});
