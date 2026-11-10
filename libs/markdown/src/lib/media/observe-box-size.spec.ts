import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeBoxSize, observeColumnWidth } from './observe-box-size';

class FakeResizeObserver {
    static instance: FakeResizeObserver | null = null;
    disconnected = false;

    constructor(readonly callback: () => void) {
        FakeResizeObserver.instance = this;
    }

    observe(): void {}

    disconnect(): void {
        this.disconnected = true;
    }
}

describe('observeBoxSize', () => {
    beforeEach(() => vi.stubGlobal('ResizeObserver', FakeResizeObserver));
    afterEach(() => vi.unstubAllGlobals());

    it('reports nothing while the box is empty and the size once it has one', () => {
        const element = { offsetWidth: 0, offsetHeight: 0 } as HTMLElement;
        const report = vi.fn();
        observeBoxSize(element, report);

        FakeResizeObserver.instance?.callback();
        expect(report).not.toHaveBeenCalled();

        Object.assign(element, { offsetWidth: 140, offsetHeight: 40 });
        FakeResizeObserver.instance?.callback();
        expect(report).toHaveBeenCalledExactlyOnceWith({ width: 140, height: 40 });
    });

    it('stops observing when told to', () => {
        const stop = observeBoxSize({ offsetWidth: 1, offsetHeight: 1 } as HTMLElement, vi.fn());
        stop();
        expect(FakeResizeObserver.instance?.disconnected).toBe(true);
    });
});

describe('observeColumnWidth', () => {
    beforeEach(() => vi.stubGlobal('ResizeObserver', FakeResizeObserver));
    afterEach(() => vi.unstubAllGlobals());

    it('reports the width without the scrollbar, and nothing while it is zero', () => {
        const element = { clientWidth: 0, offsetWidth: 686, parentElement: null } as unknown as HTMLElement;
        const report = vi.fn();
        observeColumnWidth(element, report);

        FakeResizeObserver.instance?.callback();
        expect(report).not.toHaveBeenCalled();

        Object.assign(element, { clientWidth: 676 });
        FakeResizeObserver.instance?.callback();
        expect(report).toHaveBeenCalledExactlyOnceWith(676);
    });
});
