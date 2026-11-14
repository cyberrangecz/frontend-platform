import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import type { Api } from '../../support/api/api-client';
import {
    ATTACHMENTS,
    type AttachmentFixture,
    imageFixtureOfSize,
    referenceWithMaxWidth,
} from '../../support/scenario/attachment-fixtures';
import { DefinitionEditorPage } from '../../support/pages/training-definition/definition-editor.page';
import { MarkdownEditorFrame } from '../../support/pages/training-definition/markdown-editor-frame';
import {
    definitionWithInfoLevel,
    fetchDefinition,
    importDefinitionBody,
} from '../../support/pages/training-definition/training-definition-data';
import { waitForNotification, waitForPageReady } from '../../support/ui';

const WIDE_VIEWPORT = { width: 1920, height: 1080 };
const NARROW_VIEWPORT = { width: 480, height: 900 };
const NARROWER_THAN_VIDEO_MINIMUM_VIEWPORT = { width: 320, height: 900 };
const ROUNDING_TOLERANCE_PIXELS = 2;
const DRAG_STEPS = 12;
const KEY_STEP_PIXELS = 16;
const MAXIMUM_SCALE = 2;
const VIDEO_MINIMUM_WIDTH = 352;

const SMALL_IMAGE = { width: 200, height: 150 };
const COMPACT_IMAGE = { width: 160, height: 80 };
const LARGE_IMAGE = { width: 600, height: 300 };
const SMALL_IMAGE_FIXTURE = imageFixtureOfSize(SMALL_IMAGE.width, SMALL_IMAGE.height);
const COMPACT_IMAGE_FIXTURE = imageFixtureOfSize(COMPACT_IMAGE.width, COMPACT_IMAGE.height);
const LARGE_IMAGE_FIXTURE = imageFixtureOfSize(LARGE_IMAGE.width, LARGE_IMAGE.height);
const STORED_VIDEO_WIDTH = 320;

const IMAGE_FRAME = '.image-frame';
const VIDEO_FRAME = '.video-frame';

interface Opened {
    editor: DefinitionEditorPage;
    frame: MarkdownEditorFrame;
    definitionId: number;
}

interface HandleLimits {
    minimum: number;
    maximum: number;
}

async function openInfoEditorInPreview(
    page: Page,
    api: Api,
    title: string,
    content: string,
    files: readonly AttachmentFixture[],
): Promise<Opened> {
    await page.setViewportSize(WIDE_VIEWPORT);
    const definition = await importDefinitionBody(api, definitionWithInfoLevel(title, content), files);
    const editor = new DefinitionEditorPage(page);
    await editor.gotoEdit(definition.id);
    await editor.openLevel(0);
    const frame = new MarkdownEditorFrame(editor.infoLevel.root.locator('crczp-markdown-editor-frame').first());
    await frame.previewTab.click();
    await expect(frame.previewPage).toBeVisible();
    await expect(frame.cards).toHaveCount(1);
    return { editor, frame, definitionId: definition.id };
}

function mediaFrameOf(frame: MarkdownEditorFrame, selector: string): Locator {
    return frame.cards.first().locator(selector);
}

function handleOf(frame: MarkdownEditorFrame): Locator {
    return frame.cards.first().locator('crczp-media-resize-handle');
}

async function widthOf(locator: Locator): Promise<number> {
    return (await locator.boundingBox())!.width;
}

async function expectWidthNear(locator: Locator, expected: number): Promise<void> {
    await expect
        .poll(async () => Math.abs((await widthOf(locator)) - expected), { message: `width of the frame near ${expected}` })
        .toBeLessThanOrEqual(ROUNDING_TOLERANCE_PIXELS);
}

/** Waits until the card has loaded and its frame stopped changing size. */
async function settledWidthOf(locator: Locator): Promise<number> {
    let previous = -1;
    await expect
        .poll(async () => {
            const current = await widthOf(locator);
            const settled = current > 0 && Math.abs(current - previous) < 0.5;
            previous = current;
            return settled;
        })
        .toBe(true);
    return widthOf(locator);
}

async function revealHandle(frame: MarkdownEditorFrame): Promise<void> {
    await frame.cards.first().locator('.attachment-frame').hover();
}

async function showRaw(frame: MarkdownEditorFrame): Promise<string> {
    await frame.rawTab.click();
    await expect(frame.rawContent).toBeVisible();
    return frame.rawContent.innerText();
}

async function showPreview(frame: MarkdownEditorFrame): Promise<void> {
    await frame.previewTab.click();
    await expect(frame.previewPage).toBeVisible();
}

/** The `maxWidth` the Raw source carries once it has settled, undefined when the reference has none. */
async function rawMaxWidth(frame: MarkdownEditorFrame): Promise<number | undefined> {
    const text = await showRaw(frame);
    const match = /\?maxWidth=(\d+)/.exec(text);
    return match ? Number(match[1]) : undefined;
}

async function expectRawMaxWidthNear(frame: MarkdownEditorFrame, expected: number): Promise<number> {
    await expect
        .poll(async () => Math.abs(((await rawMaxWidth(frame)) ?? Number.NaN) - expected))
        .toBeLessThanOrEqual(ROUNDING_TOLERANCE_PIXELS);
    return (await rawMaxWidth(frame))!;
}

/** Limits the handle announces. */
async function limitsOf(handle: Locator): Promise<HandleLimits> {
    const minimum = await handle.getAttribute('aria-valuemin');
    const maximum = await handle.getAttribute('aria-valuemax');
    return { minimum: Number(minimum), maximum: Number(maximum) };
}

/** The pointer movement that changes a card's width by `growth` along its diagonal, whose height per width is `heightPerWidth`. */
function diagonalOf(growth: number, heightPerWidth: number): { deltaX: number; deltaY: number } {
    return { deltaX: growth, deltaY: growth * heightPerWidth };
}

/** Drags the handle with the pointer, reporting the limits it announced before the release. */
async function dragHandle(page: Page, handle: Locator, { deltaX, deltaY = 0 }: { deltaX: number; deltaY?: number }): Promise<HandleLimits> {
    const box = (await handle.boundingBox())!;
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const targetX = Math.min(Math.max(startX + deltaX, 1), WIDE_VIEWPORT.width - 1);
    const targetY = Math.min(Math.max(startY + deltaY, 1), WIDE_VIEWPORT.height - 1);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: DRAG_STEPS });
    const limits = await limitsOf(handle);
    await page.mouse.up();
    return limits;
}

async function saveAndWait(editor: DefinitionEditorPage): Promise<void> {
    await expect(editor.saveButton).toBeEnabled();
    await editor.saveButton.click();
    await waitForNotification(editor.page, /saved/i);
}

async function storedContent(api: Api, definitionId: number): Promise<string> {
    const level = (await fetchDefinition(api, definitionId)).levels?.[0];
    return String(level?.['content'] ?? '');
}

/** Focuses the handle, which starts a resize session, and reads the limits it announces. */
async function focusedLimitsOf(frame: MarkdownEditorFrame): Promise<HandleLimits> {
    await revealHandle(frame);
    const handle = handleOf(frame);
    await handle.focus();
    await expect(handle).toHaveAttribute('aria-valuemin', /\d/);
    return limitsOf(handle);
}

test.describe('linear-definition.attachments-resize', () => {
    test.use({ account: 'trainingDesigner' });

    test('writes ?maxWidth into the reference when the handle is dragged in Preview', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const { editor, frame, definitionId } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-drag'),
            SMALL_IMAGE_FIXTURE.reference,
            [SMALL_IMAGE_FIXTURE],
        );
        const imageFrame = mediaFrameOf(frame, IMAGE_FRAME);
        const startWidth = Math.round(await settledWidthOf(imageFrame));
        const growth = 60;

        await revealHandle(frame);
        await dragHandle(page, handleOf(frame), diagonalOf(growth, SMALL_IMAGE.height / SMALL_IMAGE.width));

        await expectWidthNear(imageFrame, startWidth + growth);
        const written = await expectRawMaxWidthNear(frame, startWidth + growth);
        await saveAndWait(editor);
        expect(await storedContent(api, definitionId)).toContain(`attachment:${SMALL_IMAGE_FIXTURE.hash}?maxWidth=${written}`);
    });

    test('lets the vertical pointer axis drive the width on the locked aspect ratio', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-vertical'),
            SMALL_IMAGE_FIXTURE.reference,
            [SMALL_IMAGE_FIXTURE],
        );
        const imageFrame = mediaFrameOf(frame, IMAGE_FRAME);
        const startWidth = Math.round(await settledWidthOf(imageFrame));
        const heightPerWidth = SMALL_IMAGE.height / SMALL_IMAGE.width;
        const verticalTravel = 60;
        const expectedGrowth = (verticalTravel * heightPerWidth) / (1 + heightPerWidth ** 2);

        await revealHandle(frame);
        await dragHandle(page, handleOf(frame), { deltaX: 0, deltaY: verticalTravel });

        await expectWidthNear(imageFrame, startWidth + expectedGrowth);
        await expectRawMaxWidthNear(frame, startWidth + expectedGrowth);
    });

    test('announces the slider value and range without focus', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-aria'),
            referenceWithMaxWidth(SMALL_IMAGE_FIXTURE, 150),
            [SMALL_IMAGE_FIXTURE],
        );
        const handle = handleOf(frame);

        await expect(handle).toHaveAttribute('aria-valuemin', /^\d+$/);
        await expect(handle).toHaveAttribute('aria-valuemax', /^\d+$/);
        await expect(handle).toHaveAttribute('aria-valuenow', '150');
        await expect(handle).not.toBeFocused();
    });

    test('changes the width with the arrow keys and Home and End, commits with Enter and drops the change with Escape', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-keyboard'),
            SMALL_IMAGE_FIXTURE.reference,
            [SMALL_IMAGE_FIXTURE],
        );
        const imageFrame = mediaFrameOf(frame, IMAGE_FRAME);
        const startWidth = Math.round(await settledWidthOf(imageFrame));
        const handle = handleOf(frame);
        const { minimum, maximum } = await focusedLimitsOf(frame);

        await handle.press('ArrowRight');
        await handle.press('ArrowRight');
        await expectWidthNear(imageFrame, startWidth + 2 * KEY_STEP_PIXELS);
        await handle.press('Enter');
        const committed = await expectRawMaxWidthNear(frame, startWidth + 2 * KEY_STEP_PIXELS);
        await showPreview(frame);

        await handle.press('ArrowLeft');
        await expectWidthNear(imageFrame, committed - KEY_STEP_PIXELS);
        await handle.press('Escape');
        await expectWidthNear(imageFrame, committed);
        expect(await rawMaxWidth(frame)).toBe(committed);
        await showPreview(frame);

        await handle.focus();
        await handle.press('End');
        await expectWidthNear(imageFrame, maximum);
        await handle.press('Enter');
        expect(await expectRawMaxWidthNear(frame, maximum)).toBe(maximum);
        await showPreview(frame);

        await handle.focus();
        await handle.press('Home');
        await expectWidthNear(imageFrame, minimum);
        await handle.press('Enter');
        expect(await expectRawMaxWidthNear(frame, minimum)).toBe(minimum);
    });

    test('removes the parameter with Reset size', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-reset'),
            referenceWithMaxWidth(SMALL_IMAGE_FIXTURE, 150),
            [SMALL_IMAGE_FIXTURE],
        );
        const imageFrame = mediaFrameOf(frame, IMAGE_FRAME);
        await expectWidthNear(imageFrame, 150);

        await revealHandle(frame);
        const resetButton = frame.cards.first().getByRole('button', { name: 'Reset size' });
        const replaceButton = frame.cards.first().getByRole('button', { name: 'Replace file' });
        await expect(resetButton).toBeEnabled();
        const replaceBefore = (await replaceButton.boundingBox())!;
        await resetButton.click();

        await expectWidthNear(imageFrame, SMALL_IMAGE.width);
        await expect.poll(() => rawMaxWidth(frame)).toBeUndefined();
        await expect(frame.rawContent).not.toContainText('maxWidth');
        await showPreview(frame);
        await revealHandle(frame);
        await expect(resetButton).toBeVisible();
        await expect(resetButton).toBeDisabled();
        const replaceAfter = (await replaceButton.boundingBox())!;
        expect(replaceAfter.x).toBeCloseTo(replaceBefore.x, 0);
        expect(replaceAfter.y).toBeCloseTo(replaceBefore.y, 0);
    });

    test('keeps Reset size in the toolbar, disabled, while no width is saved', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-reset-disabled'),
            SMALL_IMAGE_FIXTURE.reference,
            [SMALL_IMAGE_FIXTURE],
        );

        await revealHandle(frame);

        await expect(frame.cards.first().getByRole('button', { name: 'Reset size' })).toBeDisabled();
    });

    test('puts the handle outside the corner of a small card and over the corner of a larger one', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const compact = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-handle-compact'),
            COMPACT_IMAGE_FIXTURE.reference,
            [COMPACT_IMAGE_FIXTURE],
        );
        await settledWidthOf(mediaFrameOf(compact.frame, IMAGE_FRAME));
        await revealHandle(compact.frame);
        const compactFrameBox = (await mediaFrameOf(compact.frame, IMAGE_FRAME).boundingBox())!;
        const compactHandleBox = (await handleOf(compact.frame).boundingBox())!;
        expect(compactHandleBox.y).toBeGreaterThanOrEqual(compactFrameBox.y + compactFrameBox.height - ROUNDING_TOLERANCE_PIXELS);

        const larger = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-handle-larger'),
            SMALL_IMAGE_FIXTURE.reference,
            [SMALL_IMAGE_FIXTURE],
        );
        await settledWidthOf(mediaFrameOf(larger.frame, IMAGE_FRAME));
        await revealHandle(larger.frame);
        const largerFrameBox = (await mediaFrameOf(larger.frame, IMAGE_FRAME).boundingBox())!;
        const largerHandleBox = (await handleOf(larger.frame).boundingBox())!;
        expect(largerHandleBox.y + largerHandleBox.height).toBeLessThanOrEqual(largerFrameBox.y + largerFrameBox.height + ROUNDING_TOLERANCE_PIXELS);
    });

    test('caps a resize at the editor column and leaves a saved width alone when the column narrows', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const saved = 500;
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-column'),
            referenceWithMaxWidth(LARGE_IMAGE_FIXTURE, saved),
            [LARGE_IMAGE_FIXTURE],
        );
        const imageFrame = mediaFrameOf(frame, IMAGE_FRAME);
        const handle = handleOf(frame);
        await expectWidthNear(imageFrame, saved);

        const column = await widthOf(frame.cards.first());
        const { maximum } = await focusedLimitsOf(frame);
        expect(maximum).toBeLessThanOrEqual(column + ROUNDING_TOLERANCE_PIXELS);
        expect(maximum).toBeLessThan(MAXIMUM_SCALE * LARGE_IMAGE.width);
        await handle.press('End');
        await expectWidthNear(imageFrame, maximum);
        await handle.press('Escape');

        await page.setViewportSize(NARROW_VIEWPORT);
        await expect.poll(async () => widthOf(imageFrame)).toBeLessThan(saved);
        await handle.focus();
        await handle.blur();
        await page.setViewportSize(WIDE_VIEWPORT);
        await expectWidthNear(imageFrame, saved);
        expect(await rawMaxWidth(frame)).toBe(saved);
    });

    test('keeps a video at its minimum width in a narrower column and scrolls the card sideways, not the preview', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-scroll'),
            ATTACHMENTS.video.reference,
            [ATTACHMENTS.video],
        );
        await page.setViewportSize(NARROWER_THAN_VIDEO_MINIMUM_VIEWPORT);

        const videoFrame = mediaFrameOf(frame, VIDEO_FRAME);
        await expect.poll(async () => widthOf(videoFrame)).toBeGreaterThanOrEqual(VIDEO_MINIMUM_WIDTH - ROUNDING_TOLERANCE_PIXELS);
        await expectWidthNear(videoFrame, VIDEO_MINIMUM_WIDTH);
        const scrollsSideways = await frame.cards.first().evaluate((element) => element.scrollWidth > element.clientWidth);
        const pageScrollsSideways = await frame.previewPage.evaluate((element) => element.scrollWidth > element.clientWidth);
        expect(scrollsSideways).toBe(true);
        expect(pageScrollsSideways).toBe(false);
    });

    test('keeps a dragged width inside the minimum and the larger of twice the natural width and the minimum', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-clamp'),
            SMALL_IMAGE_FIXTURE.reference,
            [SMALL_IMAGE_FIXTURE],
        );
        const imageFrame = mediaFrameOf(frame, IMAGE_FRAME);
        const startWidth = Math.round(await settledWidthOf(imageFrame));

        await revealHandle(frame);
        const upperLimits = await dragHandle(page, handleOf(frame), { deltaX: WIDE_VIEWPORT.width });
        const maximum = Math.max(MAXIMUM_SCALE * SMALL_IMAGE.width, upperLimits.minimum);
        expect(upperLimits.maximum).toBe(maximum);
        expect(await expectRawMaxWidthNear(frame, maximum)).toBe(maximum);
        await expectWidthNear(imageFrame, maximum);
        await showPreview(frame);

        await revealHandle(frame);
        const lowerLimits = await dragHandle(page, handleOf(frame), { deltaX: -WIDE_VIEWPORT.width });
        expect(lowerLimits.minimum).toBeGreaterThan(0);
        expect(lowerLimits.minimum).toBeLessThanOrEqual(startWidth);
        expect(await expectRawMaxWidthNear(frame, lowerLimits.minimum)).toBe(lowerLimits.minimum);
        await showPreview(frame);
        await expectWidthNear(imageFrame, lowerLimits.minimum);
    });

    test('shows a video stored narrower than the video minimum scaled up to it', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-video-minimum'),
            ATTACHMENTS.video.reference,
            [ATTACHMENTS.video],
        );
        const videoFrame = mediaFrameOf(frame, VIDEO_FRAME);
        const { minimum, maximum } = await focusedLimitsOf(frame);

        expect(minimum).toBeGreaterThan(STORED_VIDEO_WIDTH);
        expect(maximum).toBe(Math.max(MAXIMUM_SCALE * STORED_VIDEO_WIDTH, minimum));
        await expectWidthNear(videoFrame, minimum);

        await showRaw(frame);
        await expect(frame.rawContent).not.toContainText('maxWidth');
    });

    test('scales a video up to the minimum however small a width is saved for it', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-video-saved-small'),
            referenceWithMaxWidth(ATTACHMENTS.video, 100),
            [ATTACHMENTS.video],
        );
        const { minimum } = await focusedLimitsOf(frame);

        await expectWidthNear(mediaFrameOf(frame, VIDEO_FRAME), minimum);
        expect(minimum).toBeGreaterThan(100);
    });

    test('clamps a hand-written out-of-range maxWidth when it is rendered', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const tooWide = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-hand-written-wide'),
            referenceWithMaxWidth(SMALL_IMAGE_FIXTURE, 100_000),
            [SMALL_IMAGE_FIXTURE],
        );
        const { minimum: imageMinimum, maximum: imageMaximum } = await focusedLimitsOf(tooWide.frame);
        expect(imageMaximum).toBe(Math.max(MAXIMUM_SCALE * SMALL_IMAGE.width, imageMinimum));
        await expectWidthNear(mediaFrameOf(tooWide.frame, IMAGE_FRAME), imageMaximum);

        const tooNarrow = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-hand-written-narrow'),
            referenceWithMaxWidth(SMALL_IMAGE_FIXTURE, 1),
            [SMALL_IMAGE_FIXTURE],
        );
        const narrowLimits = await focusedLimitsOf(tooNarrow.frame);
        await expectWidthNear(mediaFrameOf(tooNarrow.frame, IMAGE_FRAME), narrowLimits.minimum);
        expect(narrowLimits.minimum).toBeGreaterThan(1);

        const videoTooWide = await openInfoEditorInPreview(
            page,
            api,
            uniqueName('resize-hand-written-video'),
            referenceWithMaxWidth(ATTACHMENTS.video, 100_000),
            [ATTACHMENTS.video],
        );
        const videoLimits = await focusedLimitsOf(videoTooWide.frame);
        const videoWidth = await settledWidthOf(mediaFrameOf(videoTooWide.frame, VIDEO_FRAME));
        expect(videoWidth).toBeLessThanOrEqual(videoLimits.maximum + ROUNDING_TOLERANCE_PIXELS);
        expect(videoWidth).toBeGreaterThanOrEqual(videoLimits.minimum - ROUNDING_TOLERANCE_PIXELS);
    });

    test.describe('rendering of a saved maxWidth', () => {
        const SAVED_IMAGE_WIDTH = 400;
        const SAVED_VIDEO_WIDTH = 2 * STORED_VIDEO_WIDTH;

        async function openSavedDefinitionPreview(page: Page, api: Api, title: string): Promise<Locator> {
            const content = [
                referenceWithMaxWidth(LARGE_IMAGE_FIXTURE, SAVED_IMAGE_WIDTH),
                referenceWithMaxWidth(ATTACHMENTS.video, SAVED_VIDEO_WIDTH),
            ].join('\n\n');
            const definition = await importDefinitionBody(api, definitionWithInfoLevel(title, content), [
                LARGE_IMAGE_FIXTURE,
                ATTACHMENTS.video,
            ]);
            await page.goto(`/linear-definition/${definition.id}/preview`);
            await waitForPageReady(page);
            const markdown = page.locator('crczp-abstract-level crczp-markdown-view').first();
            await expect(markdown.locator(IMAGE_FRAME)).toBeVisible();
            await expect(markdown.locator(VIDEO_FRAME)).toBeVisible();
            return markdown;
        }

        test('shows a saved maxWidth at that width on a wide viewport', async ({ page, apiAs, uniqueName }) => {
            await page.setViewportSize(WIDE_VIEWPORT);
            const markdown = await openSavedDefinitionPreview(page, apiAs('trainingDesigner'), uniqueName('resize-render-wide'));
            const available = await widthOf(markdown);

            await expectWidthNear(markdown.locator(IMAGE_FRAME), Math.min(SAVED_IMAGE_WIDTH, available));
            await expectWidthNear(markdown.locator(VIDEO_FRAME), Math.min(SAVED_VIDEO_WIDTH, available));
        });

        test('shrinks a saved maxWidth to fit a narrow viewport', async ({ page, apiAs, uniqueName }) => {
            await page.setViewportSize(NARROW_VIEWPORT);
            const markdown = await openSavedDefinitionPreview(page, apiAs('trainingDesigner'), uniqueName('resize-render-narrow'));
            const available = await widthOf(markdown);

            expect(available).toBeLessThan(SAVED_IMAGE_WIDTH);
            await expectWidthNear(markdown.locator(IMAGE_FRAME), available);
            await expectWidthNear(markdown.locator(VIDEO_FRAME), Math.max(available, VIDEO_MINIMUM_WIDTH));
        });

        test('keeps a video at its minimum width below it and scrolls its card sideways', async ({ page, apiAs, uniqueName }) => {
            await page.setViewportSize(NARROWER_THAN_VIDEO_MINIMUM_VIEWPORT);
            const markdown = await openSavedDefinitionPreview(page, apiAs('trainingDesigner'), uniqueName('resize-render-scroll'));

            expect(await widthOf(markdown)).toBeLessThan(VIDEO_MINIMUM_WIDTH);
            await expectWidthNear(markdown.locator(VIDEO_FRAME), VIDEO_MINIMUM_WIDTH);
            const card = markdown.locator('crczp-attachment-media').filter({ has: markdown.locator(VIDEO_FRAME) });
            const scrollsSideways = await card.evaluate((element) => element.scrollWidth > element.clientWidth);
            expect(scrollsSideways).toBe(true);
        });
    });
});
