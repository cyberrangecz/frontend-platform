import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaSizeLimits } from './media-size-limits';
import { MediaResizeHandleComponent } from './media-resize-handle.component';

const LIMITS: MediaSizeLimits = { minimum: 353, maximum: 1000 };
const START_WIDTH = 480;

@Component({
    imports: [MediaResizeHandleComponent],
    template: `
        <crczp-media-resize-handle
            [currentWidth]="currentWidth"
            [limits]="limits()"
            [shownWidth]="shownWidth()"
            (preview)="events.push(['preview', $event])"
            (resized)="events.push(['resized', $event])"
        />
    `,
})
class ResizeHandleHostComponent {
    readonly currentWidth = (): number => START_WIDTH;
    readonly limits = signal<MediaSizeLimits | null>(LIMITS);
    readonly shownWidth = signal<number | null>(START_WIDTH);
    readonly events: [string, number | null][] = [];
}

describe('MediaResizeHandleComponent', () => {
    let fixture: ComponentFixture<ResizeHandleHostComponent>;
    let handle: HTMLElement;

    function pointer(type: string, pointerId: number, clientX: number): void {
        handle.dispatchEvent(new PointerEvent(type, { pointerId, clientX, clientY: 0, button: 0, bubbles: true, cancelable: true }));
        fixture.detectChanges();
    }

    beforeEach(() => {
        fixture = TestBed.createComponent(ResizeHandleHostComponent);
        fixture.detectChanges();
        handle = fixture.nativeElement.querySelector('crczp-media-resize-handle') as HTMLElement;
        handle.setPointerCapture = vi.fn();
    });

    afterEach(() => vi.restoreAllMocks());

    it('is the plain grip, with no readout of its own', () => {
        expect(handle.querySelector('.resize-handle-grip')).not.toBeNull();
        expect(handle.textContent?.trim()).toBe('drag_handle');
    });

    it('announces its range and the shown width before any resize', () => {
        expect(handle.getAttribute('aria-valuemin')).toBe('353');
        expect(handle.getAttribute('aria-valuemax')).toBe('1000');
        expect(handle.getAttribute('aria-valuenow')).toBe(String(START_WIDTH));
    });

    it('announces a range that follows new limits while no resize is in progress', () => {
        fixture.componentInstance.limits.set({ minimum: 200, maximum: 600 });
        fixture.detectChanges();

        expect(handle.getAttribute('aria-valuemin')).toBe('200');
        expect(handle.getAttribute('aria-valuemax')).toBe('600');
    });

    it('announces a shown width of 0', () => {
        fixture.componentInstance.shownWidth.set(0);
        fixture.detectChanges();

        expect(handle.getAttribute('aria-valuenow')).toBe('0');
    });

    it('follows only the pointer that started the drag', () => {
        pointer('pointerdown', 1, 0);
        pointer('pointermove', 2, 300);
        pointer('pointerup', 2, 300);

        expect(fixture.componentInstance.events).toEqual([]);
        expect(handle.classList).toContain('resize-handle--active');

        pointer('pointermove', 1, 100);
        pointer('pointerup', 1, 100);

        expect(fixture.componentInstance.events.at(-1)?.[0]).toBe('resized');
        expect(handle.classList).not.toContain('resize-handle--active');
    });

    it('drops the change when the browser cancels the drag pointer, and ignores other pointers cancelling', () => {
        pointer('pointerdown', 1, 0);
        pointer('pointermove', 1, 100);
        pointer('pointercancel', 2, 100);

        expect(handle.classList).toContain('resize-handle--active');

        pointer('pointercancel', 1, 100);

        expect(fixture.componentInstance.events.at(-1)).toEqual(['preview', null]);
        expect(fixture.componentInstance.events.some(([kind]) => kind === 'resized')).toBe(false);
        expect(handle.classList).not.toContain('resize-handle--active');
    });

    it('closes its preview before it reports the final width', () => {
        pointer('pointerdown', 1, 0);
        pointer('pointermove', 1, 100);
        pointer('pointerup', 1, 100);

        const events = fixture.componentInstance.events;
        expect(events.slice(-2)).toEqual([
            ['preview', null],
            ['resized', events.at(-1)?.[1]],
        ]);
        expect(events.at(-1)?.[1]).toBeGreaterThan(START_WIDTH);
    });

    it('closes its preview and reports nothing when the width did not change', () => {
        pointer('pointerdown', 1, 0);
        pointer('pointerup', 1, 0);

        expect(fixture.componentInstance.events).toEqual([['preview', null]]);
    });
});
