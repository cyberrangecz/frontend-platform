import type { Locator } from '@playwright/test';
import { pageOf } from './scope';

const DRAG_MOVE_STEPS = 10;
const DRAG_START_OFFSET = 8;

/**
 * Drags an element onto another with the mouse the way a user does: press on the source, move in
 * several steps so a drag-and-drop library recognises the gesture, then release over the target.
 */
export async function dragWithMouse(source: Locator, target: Locator): Promise<void> {
    const mouse = pageOf(source).mouse;
    await target.scrollIntoViewIfNeeded();
    await source.scrollIntoViewIfNeeded();
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    if (sourceBox === null || targetBox === null) {
        throw new Error('The drag source and target must both be visible');
    }
    const sourceCenter = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
    const targetCenter = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };
    await mouse.move(sourceCenter.x, sourceCenter.y);
    await mouse.down();
    await mouse.move(sourceCenter.x + DRAG_START_OFFSET, sourceCenter.y + DRAG_START_OFFSET);
    await mouse.move(targetCenter.x, targetCenter.y, { steps: DRAG_MOVE_STEPS });
    await mouse.move(targetCenter.x + 1, targetCenter.y);
    await mouse.up();
}
