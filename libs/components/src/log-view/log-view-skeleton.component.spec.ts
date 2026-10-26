import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    LogViewSkeleton,
    SKELETON_BUILD_STEP_MS,
    SKELETON_SHOW_DELAY_MS,
} from './log-view-skeleton.component';
import { LogSkeletonRow } from './log-view-skeleton-samples';

const SAMPLE: readonly LogSkeletonRow[] = [
    { indent: 0, width: 40 },
    { indent: 0, width: 0 },
    { indent: 6, width: 30 },
];
const VIEWPORT_ROW_CAPACITY = 128;
const ROW_HEIGHT_PX = 20;
const CONTENT_PADDING_TOP_PX = 8;
const FITTING_ROWS = 4;

describe('LogViewSkeleton', () => {
    let fixture: ComponentFixture<LogViewSkeleton>;
    let reducedMotion: boolean;

    const host = () => fixture.nativeElement as HTMLElement;
    const rows = () => Array.from(host().querySelectorAll<HTMLElement>('.skeleton-row'));
    const growingRows = () => host().querySelectorAll('.skeleton-row--growing:not(.skeleton-row--pending)');
    const rowShape = (row: HTMLElement) => ({
        indent: Number(row.style.getPropertyValue('--skeleton-row-indent')),
        width: row.querySelector<HTMLElement>('.skeleton-loader')?.style.width ?? null,
    });
    const advance = (milliseconds: number) => {
        vi.advanceTimersByTime(milliseconds);
        fixture.detectChanges();
    };
    const showSkeleton = () => advance(SKELETON_SHOW_DELAY_MS);
    const completeBuildUp = () => advance(SKELETON_BUILD_STEP_MS * FITTING_ROWS);

    beforeEach(() => {
        vi.useFakeTimers();
        reducedMotion = false;
        vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
        vi.spyOn(window, 'getComputedStyle').mockReturnValue({
            lineHeight: `${ROW_HEIGHT_PX}px`,
        } as CSSStyleDeclaration);
        fixture = TestBed.createComponent(LogViewSkeleton);
        Object.defineProperty(host(), 'clientHeight', {
            value: CONTENT_PADDING_TOP_PX + FITTING_ROWS * ROW_HEIGHT_PX,
        });
        fixture.componentRef.setInput('sample', SAMPLE);
        fixture.detectChanges();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('is hidden from assistive technology', () => {
        expect(host().getAttribute('aria-hidden')).toBe('true');
    });

    describe('show delay', () => {
        it('draws nothing before the delay has passed', () => {
            advance(SKELETON_SHOW_DELAY_MS - 1);
            expect(rows()).toHaveLength(0);
            expect(host().classList).toContain('skeleton-waiting');
        });

        it('draws nothing at all when the view is destroyed before the delay', () => {
            fixture.destroy();
            vi.advanceTimersByTime(SKELETON_SHOW_DELAY_MS * 2);
            expect(vi.getTimerCount()).toBe(0);
        });

        it('draws the first row once the delay has passed', () => {
            showSkeleton();
            expect(host().classList).not.toContain('skeleton-waiting');
            expect(growingRows()).toHaveLength(1);
        });
    });

    describe('build-up', () => {
        it('adds one row per step from the top down', () => {
            showSkeleton();
            const firstViewportRowIndex = rows().findIndex((row) =>
                row.classList.contains('skeleton-row--growing'),
            );
            for (let built = 2; built <= FITTING_ROWS - 1; built++) {
                advance(SKELETON_BUILD_STEP_MS);
                const growing = rows()
                    .map((row, index) => (row.classList.contains('skeleton-row--growing') ? index : -1))
                    .filter((index) => index >= firstViewportRowIndex);
                expect(growing).toHaveLength(built);
                expect(growing[0]).toBe(firstViewportRowIndex);
            }
        });

        it('keeps the rows below the built ones hidden', () => {
            showSkeleton();
            expect(host().querySelectorAll('.skeleton-row--pending').length).toBeGreaterThan(0);
        });

        it('starts the loop only after the viewport is filled', () => {
            showSkeleton();
            advance(SKELETON_BUILD_STEP_MS * (FITTING_ROWS - 2));
            expect(host().classList).not.toContain('skeleton-looping');
            advance(SKELETON_BUILD_STEP_MS);
            expect(host().classList).toContain('skeleton-looping');
            expect(host().querySelectorAll('.skeleton-row--growing, .skeleton-row--pending')).toHaveLength(0);
        });

        it('stops adding rows after the loop has started', () => {
            showSkeleton();
            completeBuildUp();
            expect(vi.getTimerCount()).toBe(0);
        });
    });

    describe('reduced motion', () => {
        it('shows the filled rectangles at once after the delay', () => {
            reducedMotion = true;
            showSkeleton();
            expect(host().classList).toContain('skeleton-looping');
            expect(host().querySelectorAll('.skeleton-row--growing, .skeleton-row--pending')).toHaveLength(0);
        });
    });

    describe('swap', () => {
        it('stops its timer when removed in the middle of the build-up', () => {
            showSkeleton();
            advance(SKELETON_BUILD_STEP_MS);
            fixture.destroy();
            expect(vi.getTimerCount()).toBe(0);
        });
    });

    describe('strip', () => {
        beforeEach(() => {
            showSkeleton();
            completeBuildUp();
        });

        it('tiles the sample end to end so every row repeats one sample later', () => {
            const shapes = rows().map(rowShape);
            shapes.forEach((shape, index) => {
                const next = shapes[index + SAMPLE.length];
                if (next) expect(next).toEqual(shape);
            });
            expect(shapes.slice(0, SAMPLE.length)).toEqual([
                { indent: 0, width: '40ch' },
                { indent: 0, width: null },
                { indent: 6, width: '30ch' },
            ]);
        });

        it('fills the tallest viewport with one whole sample left to scroll in', () => {
            expect(rows().length % SAMPLE.length).toBe(0);
            expect(rows().length).toBeGreaterThanOrEqual(VIEWPORT_ROW_CAPACITY + SAMPLE.length);
        });

        it('hands the sample length and widest row to the loop', () => {
            expect(host().style.getPropertyValue('--skeleton-sample-rows')).toBe(`${SAMPLE.length}`);
            expect(host().style.getPropertyValue('--skeleton-widest-row')).toBe('40');
        });

        it('draws no rectangle on a blank row', () => {
            expect(rows()[1]?.querySelector('ngx-skeleton-loader')).toBeNull();
        });

        it('colours the rectangles from the log palette', () => {
            const rectangle = host().querySelector<HTMLElement>('.skeleton-loader');
            expect(rectangle?.style.getPropertyValue('--ngx-skeleton-loader-base-color')).toContain(
                'var(--log-background)',
            );
        });
    });
});
