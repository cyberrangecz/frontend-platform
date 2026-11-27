import type { Locator } from '@playwright/test';
import { pageOf } from './scope';

const DRAG_MOVE_STEPS = 10;
const DRAG_START_OFFSET = 8;
const BOX_SAMPLE_INTERVAL_MILLISECONDS = 100;
const BOX_SETTLE_TIMEOUT_MILLISECONDS = 10_000;

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

/**
 * Drags an element onto another with the mouse the way a user does: press on the source, move in
 * several steps so a drag-and-drop library recognises the gesture, then release over the target.
 */
export async function dragWithMouse(source: Locator, target: Locator): Promise<void> {
    const mouse = pageOf(source).mouse;
    await settledBoxOf(target);
    const sourceBox = await settledBoxOf(source);
    const targetBox = await settledBoxOf(target);
    const sourceCenter = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
    const targetCenter = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };
    await mouse.move(sourceCenter.x, sourceCenter.y);
    await mouse.down();
    await mouse.move(sourceCenter.x + DRAG_START_OFFSET, sourceCenter.y + DRAG_START_OFFSET);
    await mouse.move(targetCenter.x, targetCenter.y, { steps: DRAG_MOVE_STEPS });
    await mouse.move(targetCenter.x + 1, targetCenter.y);
    await mouse.up();
}
