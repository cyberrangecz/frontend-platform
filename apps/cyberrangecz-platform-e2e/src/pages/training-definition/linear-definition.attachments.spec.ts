import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import type { Api } from '../../support/api/api-client';
import {
    ATTACHMENT_LIST,
    ATTACHMENTS,
    type AttachmentFixture,
    referencesOf,
    textFixtureNamed,
} from '../../support/scenario/attachment-fixtures';
import { DefinitionEditorPage } from '../../support/pages/training-definition/definition-editor.page';
import { DefinitionOverviewPage } from '../../support/pages/training-definition/definition-overview.page';
import {
    dropFiles,
    MarkdownEditorFrame,
} from '../../support/pages/training-definition/markdown-editor-frame';
import {
    definitionWithInfoLevel,
    exportDefinitionAnswer,
    fetchMaterials,
    fetchDefinition,
    fetchDefinitionByTitle,
    fetchMaterialHashes,
    importDefinitionBody,
} from '../../support/pages/training-definition/training-definition-data';
import { parseArchive, retitledArchive, ZIP_MEDIA_TYPE } from '../../support/scenario/definition-archive';
import { dragWithMouse, captureDownload, errorDialog, FileUploadDialog, waitForNotification } from '../../support/ui';

const MISSING_HASH = '0'.repeat(64);
const SOURCE_VIDEO = { durationSeconds: 12.5, width: 320, height: 240 };
const SOURCE_IMAGE = { width: 64, height: 48 };
const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
const WIDE_VIEWPORT = { width: 1920, height: 1080 };
const NARROW_VIEWPORT = { width: 480, height: 900 };
const SAME_ROW_TOLERANCE_PIXELS = 24;
const HAIRLINE_DRAG_PIXELS = 160;
const POINTER_ACTION_TIMEOUT_MILLISECONDS = 5_000;
const PIXELS_PER_REM = 16;
const TWO_ROW_MAXIMUM_REM = 64;
const THREE_ROW_MAXIMUM_REM = 36;

interface Opened {
    editor: DefinitionEditorPage;
    frame: MarkdownEditorFrame;
    definitionId: number;
}

async function infoContentOf(api: Api, definitionId: number): Promise<string> {
    const level = (await fetchDefinition(api, definitionId)).levels?.[0];
    return String(level?.['content'] ?? '');
}

function frameOf(editor: DefinitionEditorPage): MarkdownEditorFrame {
    return new MarkdownEditorFrame(editor.infoLevel.root.locator('crczp-markdown-editor-frame').first());
}

async function openInfoEditor(
    page: DefinitionEditorPage['page'],
    api: Api,
    title: string,
    content: string,
    files: readonly AttachmentFixture[] = [],
): Promise<Opened> {
    const definition = await importDefinitionBody(api, definitionWithInfoLevel(title, content), files);
    return openExisting(page, definition.id);
}

async function openExisting(page: DefinitionEditorPage['page'], definitionId: number): Promise<Opened> {
    const editor = new DefinitionEditorPage(page);
    await editor.gotoEdit(definitionId);
    await editor.openLevel(0);
    const frame = frameOf(editor);
    await frame.rawTab.click();
    await expect(frame.rawTab).toBeChecked();
    await expect(frame.rawContent).toBeVisible();
    return { editor, frame, definitionId };
}

async function saveAndWait(editor: DefinitionEditorPage): Promise<void> {
    await expect(editor.saveButton).toBeEnabled();
    await editor.saveButton.click();
    await waitForNotification(editor.page, /saved/i);
}

async function expectContentReferences(api: Api, definitionId: number, files: readonly AttachmentFixture[]) {
    const content = await infoContentOf(api, definitionId);
    for (const { hash } of files) {
        expect(content).toContain(`attachment:${hash}`);
    }
}

async function expectRawChips(frame: MarkdownEditorFrame, files: readonly AttachmentFixture[]) {
    await expect(frame.rawChips).toHaveCount(files.length);
    for (const { fileName } of files) {
        await expect(frame.rawChips.filter({ hasText: fileName })).toHaveCount(1);
    }
}

async function expectPreviewCards(frame: MarkdownEditorFrame, files: readonly AttachmentFixture[]) {
    await frame.previewTab.click();
    await expect(frame.previewPage).toBeVisible();
    for (const file of files) {
        const card = frame.cardOf(file);
        await expect(card).toBeVisible();
        switch (file.kind) {
            case 'image':
                await expect
                    .poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
                    .toBeGreaterThan(0);
                break;
            case 'audio':
                await expect(card.getByRole('slider', { name: 'Seek' })).toBeVisible();
                break;
            case 'video':
                await expect(card.locator('video')).toBeAttached();
                break;
            case 'text':
                await expect(card).toContainText('mode: attachment');
                break;
            case 'other':
                await expect(card.getByRole('button', { name: `Download ${file.fileName}` })).toBeVisible();
                break;
        }
    }
}

async function expectRenderedAfterReload(opened: Opened, files: readonly AttachmentFixture[]) {
    const { editor, definitionId } = opened;
    const reopened = await openExisting(editor.page, definitionId);
    await expectRawChips(reopened.frame, files);
    await expectPreviewCards(reopened.frame, files);
}

/**
 * Presses the pointer where it already rests on the shown insert slot. The slot exists only
 * while the pointer is near it, so a locator click that scrolls or moves the pointer first
 * would remove the element it aims at.
 */
async function clickInsertSlotUnderPointer(page: Page, frame: MarkdownEditorFrame): Promise<void> {
    await expect(frame.insertSlot).toBeVisible();
    await page.mouse.down();
    await page.mouse.up();
}

async function rowCount(locators: readonly Locator[]): Promise<number> {
    const tops: number[] = [];
    for (const locator of locators) {
        const top = (await locator.boundingBox())!.y;
        if (!tops.some((known) => Math.abs(known - top) <= SAME_ROW_TOLERANCE_PIXELS)) {
            tops.push(top);
        }
    }
    return tops.length;
}

/** Asserts the header strip stacks into the number of rows its own width calls for. */
async function expectStripLayout(frame: MarkdownEditorFrame) {
    const frameWidthRem = (await frame.root.boundingBox())!.width / PIXELS_PER_REM;
    const expectedRows = frameWidthRem <= THREE_ROW_MAXIMUM_REM ? 3 : frameWidthRem <= TWO_ROW_MAXIMUM_REM ? 2 : 1;
    await expect(frame.formatToolbar).toBeVisible();
    const controls = [frame.rawTab, frame.materialsToggle, frame.expandButton, frame.formatToolbar];
    const rows = await rowCount(controls);
    expect(rows, `strip rows for a frame ${frameWidthRem.toFixed(1)}rem wide`).toBe(expectedRows);
}

test.describe('linear-definition.attachments', () => {
    test.use({ account: 'trainingDesigner' });

    test('adds an image, audio, video, text and other file by browsing and placing them', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        test.slow();
        const api = apiAs('trainingDesigner');
        const opened = await openInfoEditor(page, api, uniqueName('attachments-browse'), 'Intro');
        const { editor, frame, definitionId } = opened;

        await frame.browseMaterials(ATTACHMENT_LIST);
        await expect(frame.materialRows).toHaveCount(ATTACHMENT_LIST.length);
        await frame.rawContent.click();
        for (const file of ATTACHMENT_LIST) {
            await frame.openMaterials();
            await dragWithMouse(
                frame.materialRows.filter({ hasText: file.fileName }),
                frame.rawContent,
            );
            await expect(frame.rawChips.filter({ hasText: file.fileName })).toHaveCount(1);
        }

        await saveAndWait(editor);
        await expectContentReferences(api, definitionId, ATTACHMENT_LIST);
        await expectRenderedAfterReload(opened, ATTACHMENT_LIST);
    });

    test('adds an image, audio, video, text and other file by dropping them on the content', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const opened = await openInfoEditor(page, api, uniqueName('attachments-drop'), 'Intro');
        const { editor, frame, definitionId } = opened;

        for (const file of ATTACHMENT_LIST) {
            await dropFiles(frame.rawContent, [file]);
            await expect(frame.rawChips.filter({ hasText: file.fileName })).toHaveCount(1);
        }

        await saveAndWait(editor);
        await expectContentReferences(api, definitionId, ATTACHMENT_LIST);
        await expectRenderedAfterReload(opened, ATTACHMENT_LIST);
    });

    test('adds files by dropping them on the Preview', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const opened = await openInfoEditor(page, api, uniqueName('attachments-preview-drop'), 'Intro');
        const { editor, frame, definitionId } = opened;

        await frame.previewTab.click();
        await expect(frame.previewPage).toBeVisible();
        for (const file of ATTACHMENT_LIST) {
            await dropFiles(frame.previewPage, [file]);
            await expect(frame.cardOf(file)).toBeVisible();
        }

        await saveAndWait(editor);
        await expectContentReferences(api, definitionId, ATTACHMENT_LIST);
        await expectRenderedAfterReload(opened, ATTACHMENT_LIST);
    });

    test('shows the card toolbar on pointer hover and while focused, and removes a focused card with Delete', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const { frame } = await openInfoEditor(page, api, uniqueName('attachments-toolbar'), 'Intro');
        await frame.previewTab.click();
        await expect(frame.previewPage).toBeVisible();
        for (const file of ATTACHMENT_LIST) {
            await dropFiles(frame.previewPage, [file]);
            await expect(frame.cardOf(file)).toBeVisible();
        }

        const [firstCard, secondCard] = [frame.cards.nth(0), frame.cards.nth(1)];
        const toolbar = frame.cardToolbars.nth(0);
        await firstCard.locator('.attachment-frame').hover();
        await expect(toolbar).toHaveCSS('opacity', '1');
        await expect(toolbar.getByRole('button', { name: 'Remove from level' })).toHaveAttribute('tabindex', '-1');

        await firstCard.focus();
        await page.mouse.move(0, 0);
        await expect(toolbar).toHaveCSS('opacity', '1');

        await secondCard.focus();
        await expect(toolbar).toHaveCSS('opacity', '0');
        await page.keyboard.press('Delete');
        await expect(frame.cards).toHaveCount(ATTACHMENT_LIST.length - 1);
    });

    test('downloads small media one after another from top to bottom', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const files = [ATTACHMENTS.image, ATTACHMENTS.audio, ATTACHMENTS.video, ATTACHMENTS.text];
        const { frame } = await openInfoEditor(
            page,
            api,
            uniqueName('attachments-queue'),
            referencesOf(files),
            files,
        );
        await page.evaluate(() => {
            const log: { tag: string; running: boolean }[] = [];
            (window as unknown as { downloadLog: typeof log }).downloadLog = log;
            new MutationObserver((records) => {
                for (const record of records) {
                    const target = record.target as HTMLElement;
                    if (record.attributeName === 'data-state' && /^crczp-(image|audio|video|text)-media$/i.test(target.tagName)) {
                        const state = target.getAttribute('data-state');
                        log.push({ tag: target.tagName.toLowerCase(), running: state === 'loading' || state === 'downloading' });
                    }
                }
            }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-state'] });
        });

        await frame.previewTab.click();
        await expect(frame.cards).toHaveCount(files.length);
        await expect(
            frame.root.locator(
                'crczp-attachment-media :is([data-state="idle"], [data-state="waiting"], [data-state="not-loaded"], [data-state="loading"], [data-state="downloading"])',
            ),
        ).toHaveCount(0);

        const log = await page.evaluate(() => (window as unknown as { downloadLog: { tag: string; running: boolean }[] }).downloadLog);
        const running = new Set<string>();
        const startOrder: string[] = [];
        for (const { tag, running: isRunning } of log) {
            if (isRunning) {
                running.add(tag);
                if (!startOrder.includes(tag)) {
                    startOrder.push(tag);
                }
            } else {
                running.delete(tag);
            }
            expect(running.size, `downloads running together: ${[...running].join(', ')}`).toBeLessThanOrEqual(1);
        }
        expect(startOrder).toEqual(['crczp-image-media', 'crczp-audio-media', 'crczp-video-media', 'crczp-text-media']);
    });

    test('starts a text block between 2 media in Preview from the slot beside them, and only there', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const pair = [ATTACHMENTS.image, ATTACHMENTS.audio];
        const { frame } = await openInfoEditor(
            page,
            api,
            uniqueName('attachments-preview-slot'),
            `${referencesOf(pair)}\n\nClosing text`,
            pair,
        );
        await frame.previewTab.click();
        await expect(frame.previewPage).toBeVisible();
        await page.setViewportSize(WIDE_VIEWPORT);
        const [first, second] = [frame.cards.nth(0), frame.cards.nth(1)];
        await second.scrollIntoViewIfNeeded();
        const firstBox = (await first.boundingBox())!;
        const secondBox = (await second.boundingBox())!;

        await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + 4);
        await expect(frame.insertSlot).toBeVisible();
        await page.mouse.move(firstBox.x + firstBox.width / 2, (firstBox.y + firstBox.height + secondBox.y) / 2);
        await expect(frame.insertSlot).toBeVisible();
        await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height - 4);
        await expect(frame.insertSlot).toHaveCount(0);

        await page.mouse.move(firstBox.x + firstBox.width / 2, (firstBox.y + firstBox.height + secondBox.y) / 2);
        await clickInsertSlotUnderPointer(page, frame);
        await expect(frame.previewEditor).toBeFocused();
        await frame.previewEditor.fill('between');
        await page.keyboard.press('Escape');

        await frame.rawTab.click();
        await expect(frame.rawTab).toBeChecked();
        await expect(frame.rawChips).toHaveCount(pair.length);
        await expect(frame.rawContent).toContainText('between');
        await frame.previewTab.click();
        await second.scrollIntoViewIfNeeded();
        const reopenedBox = (await first.boundingBox())!;
        await page.mouse.move(reopenedBox.x + reopenedBox.width / 2, reopenedBox.y + 4);
        await expect(frame.insertSlot).toBeVisible();
        const inserted = frame.previewPage.locator('.preview-block', { hasText: 'between' });
        const insertedBox = (await inserted.boundingBox())!;
        await page.mouse.move(insertedBox.x + insertedBox.width / 2, insertedBox.y + insertedBox.height / 2);
        await expect(frame.insertSlot).toHaveCount(0);
    });

    test('keeps every media card in Preview when a text block is inserted, typed in and deleted', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const files = [ATTACHMENTS.image, ATTACHMENTS.audio, ATTACHMENTS.video, ATTACHMENTS.text];
        const { frame } = await openInfoEditor(
            page,
            api,
            uniqueName('attachments-preview-stable'),
            `${referencesOf(files)}\n\nClosing text`,
            files,
        );
        await frame.previewTab.click();
        await page.setViewportSize(WIDE_VIEWPORT);
        await expect(frame.cards).toHaveCount(files.length);
        for (const file of files) {
            await expect(frame.cardOf(file)).toBeVisible();
        }
        await expect(frame.root.locator('crczp-attachment-media[data-state="loading"]')).toHaveCount(0);

        const tagCards = () =>
            frame.cards.evaluateAll((cards) =>
                cards.forEach((card, index) => {
                    (card as HTMLElement & { cardTag?: number }).cardTag = index;
                }),
            );
        const survivingTags = () =>
            frame.cards.evaluateAll((cards) =>
                cards.map((card) => (card as HTMLElement & { cardTag?: number }).cardTag ?? -1),
            );
        await tagCards();
        const downloads: string[] = [];
        page.on('request', (request) => {
            if (request.url().includes('/materials') || request.url().includes('attachment')) {
                downloads.push(request.url());
            }
        });

        const firstBox = (await frame.cards.nth(0).boundingBox())!;
        const secondBox = (await frame.cards.nth(1).boundingBox())!;
        await page.mouse.move(firstBox.x + firstBox.width / 2, (firstBox.y + firstBox.height + secondBox.y) / 2);
        await clickInsertSlotUnderPointer(page, frame);
        await expect(frame.previewEditor).toBeFocused();
        expect(await survivingTags()).toEqual([0, 1, 2, 3]);

        await frame.previewEditor.fill('abc');
        await expect(frame.previewEditor).toHaveText('abc');
        expect(await survivingTags()).toEqual([0, 1, 2, 3]);

        await page.keyboard.press('Escape');
        expect(await survivingTags()).toEqual([0, 1, 2, 3]);

        await frame.cards.nth(1).focus();
        await page.keyboard.press('Delete');
        await expect(frame.cards).toHaveCount(files.length - 1);
        expect(await survivingTags()).toEqual([0, 2, 3]);
        expect(downloads).toEqual([]);
    });

    test('shows a caret in a new Preview text block and takes typing right after the click', async ({ page, apiAs, uniqueName }) => {
        const api = apiAs('trainingDesigner');
        const pair = [ATTACHMENTS.image, ATTACHMENTS.audio];
        const { frame } = await openInfoEditor(page, api, uniqueName('attachments-preview-caret'), referencesOf(pair), pair);
        await frame.previewTab.click();
        await page.setViewportSize(WIDE_VIEWPORT);
        await expect(frame.cards).toHaveCount(pair.length);

        const firstBox = (await frame.cards.nth(0).boundingBox())!;
        const secondBox = (await frame.cards.nth(1).boundingBox())!;
        await page.mouse.move(firstBox.x + firstBox.width / 2, (firstBox.y + firstBox.height + secondBox.y) / 2);
        await clickInsertSlotUnderPointer(page, frame);

        await expect(frame.previewCaret).toBeVisible();
        const caretBox = (await frame.previewCaret.boundingBox())!;
        const scrollerBox = (await frame.previewEditor.locator('xpath=ancestor::*[contains(@class, "cm-scroller")]').boundingBox())!;
        expect(caretBox.height).toBeGreaterThan(0);
        expect(caretBox.x).toBeGreaterThanOrEqual(scrollerBox.x);
        await page.keyboard.insertText('typed at once');
        await expect(frame.previewEditor).toHaveText('typed at once');
    });

    test('places the caret after a media chip in Raw with one click, opening a blank line when no text follows', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const pair = [ATTACHMENTS.image, ATTACHMENTS.audio];
        const { frame } = await openInfoEditor(page, api, uniqueName('attachments-raw-caret'), referencesOf(pair), pair);

        await frame.rawChips.first().click();
        await page.keyboard.type('x');
        await expect(frame.rawContent).toContainText('x');
        await expect(frame.rawChips).toHaveCount(pair.length);
        const lines = (await frame.rawContent.locator('.cm-line').allInnerTexts()).map((line) => line.trim());
        const typedIndex = lines.indexOf('x');
        expect(typedIndex).toBeGreaterThan(0);
        expect(lines[typedIndex - 1]).toBe('');

        await frame.rawChips.last().click();
        await page.keyboard.type('y');
        const after = (await frame.rawContent.locator('.cm-line').allInnerTexts()).map((line) => line.trim());
        expect(after.at(-1)).toBe('y');
    });

    test('keeps a material stored without placing it through save and reload', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const { editor, frame, definitionId } = await openInfoEditor(
            page,
            api,
            uniqueName('attachments-stored'),
            'Intro',
        );

        await frame.browseMaterials([ATTACHMENTS.other]);
        await expect(frame.materialRows).toHaveCount(1);
        await expect(editor.unsavedChangesWarning).toBeVisible();
        await saveAndWait(editor);

        expect(await fetchMaterialHashes(api, definitionId)).toContain(ATTACHMENTS.other.hash);
        expect(await infoContentOf(api, definitionId)).not.toContain(ATTACHMENTS.other.hash);

        const reopened = await openExisting(page, definitionId);
        await expect(reopened.frame.materialsToggle).toContainText('1 file');
        await reopened.frame.openMaterials();
        await expect(reopened.frame.materialRows.filter({ hasText: ATTACHMENTS.other.fileName })).toHaveCount(1);
    });

    test('shows a missing reference red in Raw and Preview and fixes it with Choose a file', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        const api = apiAs('trainingDesigner');
        const { editor, frame, definitionId } = await openInfoEditor(
            page,
            api,
            uniqueName('attachments-missing'),
            'Intro',
            [ATTACHMENTS.image],
        );

        await frame.rawContent.fill(`![gone](attachment:${MISSING_HASH})`);
        await expect(frame.missingRawChips).toHaveCount(1);

        await frame.previewTab.click();
        await expect(frame.missingCards).toHaveCount(1);
        await expect(frame.missingCards).toContainText('This file is unavailable');

        await frame.missingCards.getByRole('button', { name: 'Choose a file' }).click();
        await expect(frame.picker.locator('.picker-option')).toHaveCount(1);
        await frame.picker.locator('.picker-option').click();
        await expect(frame.missingCards).toHaveCount(0);
        await expect(frame.cardOf(ATTACHMENTS.image)).toBeVisible();

        await frame.rawTab.click();
        await expect(frame.missingRawChips).toHaveCount(0);
        await expect(frame.rawChips).toHaveCount(1);

        await saveAndWait(editor);
        const content = await infoContentOf(api, definitionId);
        expect(content).toContain(`attachment:${ATTACHMENTS.image.hash}`);
        expect(content).not.toContain(MISSING_HASH);
    });

    test('keeps names, metadata and embeds when a definition is exported as a ZIP and imported again through the UI', async ({
        page,
        apiAs,
        uniqueName,
    }) => {
        test.slow();
        const api = apiAs('trainingDesigner');
        const clashing = textFixtureNamed(ATTACHMENTS.image.fileName, 'a second file named like the image');
        const files = [...ATTACHMENT_LIST, clashing];
        const poster = ATTACHMENTS.image.bytes.toString('base64');
        const metadataOf = ({ kind }: AttachmentFixture) =>
            kind === 'video'
                ? { durationSeconds: SOURCE_VIDEO.durationSeconds, width: SOURCE_VIDEO.width, height: SOURCE_VIDEO.height, poster }
                : kind === 'image'
                  ? { width: SOURCE_IMAGE.width, height: SOURCE_IMAGE.height }
                  : {};
        const sourceTitle = uniqueName('attachments-export');
        await importDefinitionBody(
            api,
            definitionWithInfoLevel(sourceTitle, referencesOf(files)),
            files,
            metadataOf,
        );

        const overview = new DefinitionOverviewPage(page);
        await overview.goto();
        const row = await overview.findRow(sourceTitle);
        const download = await captureDownload(page, () => overview.action(row, 'download').click());
        expect(download.fileName).toBe(`${sourceTitle}.zip`);
        const exported = parseArchive(download.bytes);
        expect(Object.keys(exported.files).sort()).toEqual(
            ['diagram (1).png', 'diagram.png', 'clip.mp4', 'payload.bin', 'settings.yaml', 'tone.wav'].sort(),
        );
        expect(new Set(Object.values(exported.metadata).map(({ fileName }) => fileName))).toEqual(
            new Set(files.map(({ fileName }) => fileName)),
        );

        const importedTitle = uniqueName('attachments-imported');
        await overview.uploadButton.click();
        const dialog = new FileUploadDialog(page);
        await dialog.chooseFiles({
            name: download.fileName,
            mimeType: ZIP_MEDIA_TYPE,
            buffer: retitledArchive(download.bytes, importedTitle),
        });
        await expect(dialog.definitionCards).toHaveCount(1);
        await dialog.confirmButton.click();
        expect((await waitForNotification(page, 'Training definition was uploaded')).kind).toBe('success');

        await expect.poll(() => fetchDefinitionByTitle(api, importedTitle)).toBeDefined();
        const imported = (await fetchDefinitionByTitle(api, importedTitle))!;
        const materials = await fetchMaterials(api, imported.id);
        expect(materials.map(({ fileName }) => fileName).sort()).toEqual(files.map(({ fileName }) => fileName).sort());
        expect(materials.map(({ hash }) => hash).sort()).toEqual(files.map(({ hash }) => hash).sort());
        expect(materials.find(({ hash }) => hash === ATTACHMENTS.video.hash)).toMatchObject(SOURCE_VIDEO);
        expect(materials.find(({ hash }) => hash === ATTACHMENTS.image.hash)).toMatchObject(SOURCE_IMAGE);

        const reExport = await exportDefinitionAnswer(api, imported.id);
        expect(reExport.kind).toBe('zip');
        if (reExport.kind === 'zip') {
            const videoEntry = Object.values(reExport.archive.metadata).find(({ poster: entryPoster }) => entryPoster);
            expect(videoEntry).toMatchObject({ fileName: ATTACHMENTS.video.fileName, poster });
        }

        const { frame } = await openExisting(page, imported.id);
        await expectPreviewCards(frame, ATTACHMENT_LIST);
    });

    test('starts an image download from a click on the image body in Preview', async ({ page, apiAs, uniqueName }) => {
        await page.route('**/config.json', async (route) => {
            const response = await route.fetch();
            const config = await response.json();
            await route.fulfill({
                response,
                json: { ...config, attachments: { ...config.attachments, autoDownloadMaxSize: '1B' } },
            });
        });
        const { frame } = await openInfoEditor(
            page,
            apiAs('trainingDesigner'),
            uniqueName('attachments-image-body-download'),
            ATTACHMENTS.image.reference,
            [ATTACHMENTS.image],
        );
        await frame.previewTab.click();
        const card = frame.cardOf(ATTACHMENTS.image);
        await expect(card.getByRole('button', { name: /^Download/ })).toBeVisible();
        await card.click({ timeout: POINTER_ACTION_TIMEOUT_MILLISECONDS });
        await expect
            .poll(() => card.locator('img.image-picture').evaluate((image: HTMLImageElement) => image.naturalWidth))
            .toBeGreaterThan(0);
    });

    test.describe('failed download', () => {
        async function openFailingDownload(
            page: DefinitionEditorPage['page'],
            api: Api,
            title: string,
        ): Promise<{ frame: MarkdownEditorFrame; download: Locator }> {
            const { frame } = await openInfoEditor(page, api, title, ATTACHMENTS.other.reference, [
                ATTACHMENTS.other,
            ]);
            await page.route('**/training-definitions/*/attachments/*', (route) =>
                route.request().method() === 'GET' ? route.fulfill({ status: 500, body: '' }) : route.continue(),
            );
            await frame.previewTab.click();
            const download = frame.cardOf(ATTACHMENTS.other).getByRole('button', {
                name: `Download ${ATTACHMENTS.other.fileName}`,
            });
            return { frame, download };
        }

        test('shows a failed download on the card without the platform error dialog', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { frame, download } = await openFailingDownload(
                page,
                apiAs('trainingDesigner'),
                uniqueName('attachments-failed-download'),
            );
            await download.focus();
            await page.keyboard.press('Enter');
            await expect(frame.cardOf(ATTACHMENTS.other).getByRole('alert')).toContainText('Download failed');
            await expect(errorDialog(page)).toBeHidden();
        });

        test('starts a download from the pointer on a file card in Preview', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { frame, download } = await openFailingDownload(
                page,
                apiAs('trainingDesigner'),
                uniqueName('attachments-pointer-download'),
            );
            await expect(download).toBeEnabled();
            await download.click({ timeout: POINTER_ACTION_TIMEOUT_MILLISECONDS });
            await expect(frame.cardOf(ATTACHMENTS.other).getByRole('alert')).toContainText('Download failed');
        });
    });

    test.describe('layout', () => {
        test('keeps edits made in the expand modal in the form', async ({ page, apiAs, uniqueName }) => {
            const { frame } = await openInfoEditor(
                page,
                apiAs('trainingDesigner'),
                uniqueName('attachments-expand'),
                'Intro',
            );

            await frame.expandButton.click();
            const dialog = page.getByRole('dialog').filter({ has: page.locator('crczp-markdown-editor-frame') });
            await expect(dialog).toBeVisible();
            const expanded = new MarkdownEditorFrame(dialog.locator('crczp-markdown-editor-frame'));
            await expect(expanded.materialsToggle).toBeVisible();
            await expanded.rawContent.click();
            await page.keyboard.press('Control+End');
            await page.keyboard.type(' expanded edit');
            await page.keyboard.press('Escape');

            await expect(dialog).toBeHidden();
            await expect(frame.rawContent).toContainText('expanded edit');
        });

        test('switches the expand modal with the editor and remembers the view after a reload', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { frame } = await openInfoEditor(
                page,
                apiAs('trainingDesigner'),
                uniqueName('attachments-shared-view'),
                'Intro',
            );

            await frame.previewTab.click();
            await frame.expandButton.click();
            const dialog = page.getByRole('dialog').filter({ has: page.locator('crczp-markdown-editor-frame') });
            const expanded = new MarkdownEditorFrame(dialog.locator('crczp-markdown-editor-frame'));
            await expect(expanded.previewTab).toBeChecked();

            await expanded.rawTab.click();
            await page.keyboard.press('Escape');
            await expect(dialog).toBeHidden();
            await expect(frame.rawTab).toBeChecked();

            await frame.previewTab.click();
            await page.reload();
            const reloaded = new DefinitionEditorPage(page);
            await reloaded.openLevel(0);
            await expect(frameOf(reloaded).previewTab).toBeChecked();
        });

        test('offers a visible close control in the expand modal', async ({ page, apiAs, uniqueName }) => {
            const { frame } = await openInfoEditor(
                page,
                apiAs('trainingDesigner'),
                uniqueName('attachments-expand-close'),
                'Intro',
            );

            await frame.expandButton.click();
            const dialog = page.getByRole('dialog').filter({ has: page.locator('crczp-markdown-editor-frame') });
            const close = dialog.getByRole('button', { name: /close/i });
            await expect(close).toBeVisible();
            await close.click();
            await expect(dialog).toBeHidden();
        });

        for (const viewport of [DEFAULT_VIEWPORT, WIDE_VIEWPORT, NARROW_VIEWPORT]) {
            test(`lays the header strip out for its own width at a ${viewport.width} px viewport`, async ({
                page,
                apiAs,
                uniqueName,
            }) => {
                await page.setViewportSize(viewport);
                const { frame } = await openInfoEditor(
                    page,
                    apiAs('trainingDesigner'),
                    uniqueName(`attachments-strip-${viewport.width}`),
                    'Intro',
                );
                await expectStripLayout(frame);
            });
        }

        test('resizes the Preview symmetrically when a hairline is dragged with the pointer', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const { frame } = await openInfoEditor(
                page,
                apiAs('trainingDesigner'),
                uniqueName('attachments-hairlines'),
                'Intro',
            );

            await frame.previewTab.click();
            await expect(frame.hairlines).toHaveCount(2);
            await frame.hairlines.first().scrollIntoViewIfNeeded();
            const before = (await frame.previewPage.boundingBox())!;
            const handle = (await frame.hairlines.first().boundingBox())!;
            const x = handle.x + handle.width / 2;
            const y = handle.y + handle.height / 2;
            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.mouse.move(x + HAIRLINE_DRAG_PIXELS, y, { steps: 8 });
            await page.mouse.up();
            const after = (await frame.previewPage.boundingBox())!;

            expect(after.width).toBeLessThan(before.width);
            expect(after.x - before.x).toBeCloseTo(before.x + before.width - (after.x + after.width), -1);
        });
    });
});
