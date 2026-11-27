import { expect, type Locator } from '@playwright/test';
import { pageOf } from './scope';

const DRAG_MOVE_STEPS = 10;
const DRAG_START_OFFSET = 8;
const BOX_SAMPLE_INTERVAL_MILLISECONDS = 100;
const BOX_SETTLE_TIMEOUT_MILLISECONDS = 10_000;
const OPEN_DIALOG_SELECTOR = '.cdk-overlay-container .mat-mdc-dialog-container';

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

/**
 * Scrolls an element into view only when it lies outside the viewport, then returns its box once
 * two samples a fixed time apart agree. The samples are timer based, so a browser that delivers
 * few animation frames, which Playwright's own stability check waits on, does not stall the wait.
 */
async function settledBoxOf(element: Locator): Promise<Box> {
    await element.evaluate((node) => node.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
    const page = pageOf(element);
    const deadline = Date.now() + BOX_SETTLE_TIMEOUT_MILLISECONDS;
    let previous: Box | null = null;
    while (Date.now() < deadline) {
        const current = await element.boundingBox();
        if (current !== null && previous !== null && sameBox(previous, current)) {
            return current;
        }
        previous = current;
        await page.waitForTimeout(BOX_SAMPLE_INTERVAL_MILLISECONDS);
    }
    throw new Error('The drag element did not settle into a stable, visible box');
}

function sameBox(first: Box, second: Box): boolean {
    return first.x === second.x && first.y === second.y && first.width === second.width && first.height === second.height;
}

/** Which part of a drop target a pointer aims at: its middle, or the quarter at its top or bottom. */
export type DropEdge = 'top' | 'middle' | 'bottom';

const EDGE_FRACTIONS: Record<DropEdge, number> = { top: 0.25, middle: 0.5, bottom: 0.75 };

/** The vertical position of a drop edge within a box. */
export function edgeY(box: { y: number; height: number }, edge: DropEdge): number {
    return box.y + box.height * EDGE_FRACTIONS[edge];
}

/**
 * Drags an element onto another with the mouse the way a user does: press on the source, move in
 * several steps so a drag-and-drop library recognises the gesture, then release over the target
 * at the given edge of it, the middle by default.
 * A dialog still closing would receive the mouse press instead of the source, so the drag starts
 * once no dialog is left on the page.
 */
export async function dragWithMouse(source: Locator, target: Locator, edge: DropEdge = 'middle'): Promise<void> {
    const page = pageOf(source);
    await expect(page.locator(OPEN_DIALOG_SELECTOR)).toHaveCount(0, { timeout: BOX_SETTLE_TIMEOUT_MILLISECONDS });
    const mouse = page.mouse;
    await settledBoxOf(target);
    const sourceBox = await settledBoxOf(source);
    const targetBox = await settledBoxOf(target);
    const sourceCenter = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
    const targetCenter = { x: targetBox.x + targetBox.width / 2, y: edgeY(targetBox, edge) };
    await mouse.move(sourceCenter.x, sourceCenter.y);
    await mouse.down();
    await mouse.move(sourceCenter.x + DRAG_START_OFFSET, sourceCenter.y + DRAG_START_OFFSET);
    await mouse.move(targetCenter.x, targetCenter.y, { steps: DRAG_MOVE_STEPS });
    await mouse.move(targetCenter.x + 1, targetCenter.y);
    await mouse.up();
}
