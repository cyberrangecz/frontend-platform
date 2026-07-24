import { expect, Locator, test } from '@playwright/test';

/** Line ceiling the rich-tooltip renderers clamp title and value text to. */
const MAX_LINES = 5;

interface TextMetrics {
    /** Computed `-webkit-line-clamp`, e.g. "5". */
    readonly lineClamp: string;
    /** Resolved line height in pixels. */
    readonly lineHeight: number;
    /** Visible (clamped) box height in pixels. */
    readonly clientHeight: number;
    /** Full unclamped content height in pixels. */
    readonly scrollHeight: number;
    /** Right edge of the element relative to the viewport. */
    readonly right: number;
}

/** Reads the layout metrics that prove an element wrapped and clamped rather than overflowed. */
function readTextMetrics(locator: Locator): Promise<TextMetrics> {
    return locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
            lineClamp:
                style.getPropertyValue('-webkit-line-clamp').trim() ||
                style.getPropertyValue('line-clamp').trim(),
            lineHeight: parseFloat(style.getPropertyValue('line-height')),
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            right: element.getBoundingClientRect().right,
        };
    });
}

/** Reads how far an element's content overflows its own box horizontally. */
function readHorizontalOverflow(locator: Locator): Promise<{ scrollWidth: number; clientWidth: number; right: number }> {
    return locator.evaluate((element) => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        right: element.getBoundingClientRect().right,
    }));
}

/**
 * Asserts a long text element wrapped onto multiple lines, was clamped to the line ceiling with the
 * overflow hidden (so the ellipsis shows), and stays inside its surface horizontally.
 */
async function expectClampedWithinSurface(text: Locator, surface: Locator): Promise<void> {
    const metrics = await readTextMetrics(text);
    const surfaceRight = (await readHorizontalOverflow(surface)).right;

    expect(metrics.lineClamp).toBe(String(MAX_LINES));
    // Genuinely wrapped onto several lines rather than sitting on one.
    expect(metrics.clientHeight).toBeGreaterThan(metrics.lineHeight * 2);
    // Never taller than the clamp ceiling (one line of slack absorbs sub-pixel rounding).
    expect(metrics.clientHeight).toBeLessThanOrEqual(metrics.lineHeight * (MAX_LINES + 1));
    // Content exceeds the clamped box, so truncation (and the ellipsis) is in effect.
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 1);
    // The text ends within the tooltip surface, never spilling past its right edge.
    expect(metrics.right).toBeLessThanOrEqual(surfaceRight + 1);
}

/** Asserts a tooltip surface does not overflow its own bounds horizontally. */
async function expectNoHorizontalOverflow(surface: Locator): Promise<void> {
    const { scrollWidth, clientWidth } = await readHorizontalOverflow(surface);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe('Rich tooltip — text never overflows the surface', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/#/tooltip');
    });

    test('ECharts string renderer clamps long title and value within the surface', async ({ page }) => {
        const surface = page.locator('[data-testid="echarts-tooltip"] > div');
        await expect(surface).toBeVisible();

        await expectNoHorizontalOverflow(surface);

        const title = surface.locator('div[style*="line-clamp"]').filter({ hasText: 'Initial Access' });
        const value = surface.locator('span[style*="line-clamp"]').filter({ hasText: 'hydra' });

        await expectClampedWithinSurface(title, surface);
        await expectClampedWithinSurface(value, surface);
    });

    test('CDK overlay component clamps long title and value within the surface', async ({ page }) => {
        const surface = page.locator('[data-testid="dom-tooltip"] crczp-rich-tooltip');
        await expect(surface).toBeVisible();

        await expectNoHorizontalOverflow(surface);

        const title = surface.locator('.tooltip-title__text');
        const value = surface.locator('.tooltip-rows__value').filter({ hasText: 'hydra' });

        await expectClampedWithinSurface(title, surface);
        await expectClampedWithinSurface(value, surface);
    });
});
