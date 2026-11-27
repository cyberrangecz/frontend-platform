import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import {
    ATTACHMENTS,
    type AttachmentFixture,
} from '../../support/scenario/attachment-fixtures';
import {
    infoContentOf,
    openInfoEditor,
    saveAndWait,
} from '../../support/pages/training-definition/attachment-editor-session';
import {
    dropFiles,
    type MarkdownEditorFrame,
} from '../../support/pages/training-definition/markdown-editor-frame';
import { dragWithMouse } from '../../support/ui';

const { image, other, text } = ATTACHMENTS;

/** The reference the editors write when a stored file is placed by dragging: an image reference named after the file. */
function placedReference(file: AttachmentFixture): string {
    return `![${file.fileName}](attachment:${file.hash})`;
}

function undoButton(page: Page): Locator {
    return page.getByRole('button', { name: 'Undo', exact: true });
}

function chipLine(frame: MarkdownEditorFrame, file: AttachmentFixture): Locator {
    return frame.rawContent.locator('.cm-line').filter({
        has: frame.page.locator('crczp-attachment-chip', { hasText: file.fileName }),
    });
}

/** Puts the caret right after the chip of a file and removes the chip with Backspace. */
async function removeRawChip(frame: MarkdownEditorFrame, file: AttachmentFixture): Promise<void> {
    await chipLine(frame, file).click();
    await frame.page.keyboard.press('End');
    await frame.page.keyboard.press('Backspace');
}

/** Removes a card in Preview with the keyboard. */
async function removePreviewCard(frame: MarkdownEditorFrame, cardIndex: number): Promise<void> {
    const card = frame.cards.nth(cardIndex);
    await expect(card).toHaveAttribute('tabindex', '0');
    await card.focus();
    await expect(card).toBeFocused();
    await frame.page.keyboard.press('Delete');
}

async function typeAtEndOfRaw(frame: MarkdownEditorFrame, typed: string): Promise<void> {
    await frame.rawContent.focus();
    await expect(frame.rawContent).toBeFocused();
    await frame.page.keyboard.press('Control+End');
    await frame.page.keyboard.type(typed);
}

const MIXED_BLOCKS = ['# Title', '', '- one', '- two', '', '```ts', 'const a = 1;', '```', ''];

test.describe('linear-definition.attachments edits', () => {
    test.use({ account: 'trainingDesigner' });

    test.describe('Raw', () => {
        test('places dragged stored files between a code block and the text around it, leaving every block intact', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            test.slow();
            const api = apiAs('trainingDesigner');
            const original = [...MIXED_BLOCKS, other.reference, '', 'Closing text'].join('\n');
            const { editor, frame, definitionId } = await openInfoEditor(
                page,
                api,
                uniqueName('attachments-raw-drag'),
                original,
                [image, text],
            );
            await expect(frame.rawChips).toHaveCount(1);

            await frame.openMaterials();
            await dragWithMouse(
                frame.materialRows.filter({ hasText: image.fileName }),
                frame.rawContent.locator('.cm-line').filter({ hasText: '```' }).last(),
                'bottom',
            );
            await expect(frame.rawChips).toHaveCount(2);

            await frame.openMaterials();
            await dragWithMouse(
                frame.materialRows.filter({ hasText: text.fileName }),
                frame.rawContent.locator('.cm-line').filter({ hasText: 'Closing text' }),
                'top',
            );
            await expect(frame.rawChips).toHaveCount(3);

            await saveAndWait(editor);
            expect(await infoContentOf(api, definitionId)).toBe(
                [
                    ...MIXED_BLOCKS,
                    placedReference(image),
                    '',
                    other.reference,
                    '',
                    placedReference(text),
                    '',
                    'Closing text',
                ].join('\n'),
            );
        });

        test('places a file dropped from outside at the position it was dropped on although the text above changed while it uploaded', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const original = '# Title\n\n- one\n- two\n\nClosing text';
            const { editor, frame, definitionId } = await openInfoEditor(
                page,
                api,
                uniqueName('attachments-raw-delayed-drop'),
                original,
            );

            let releaseUpload!: () => void;
            const uploadReleased = new Promise<void>((resolve) => (releaseUpload = resolve));
            await page.route('**/training-definitions/*/attachments', async (route) => {
                if (route.request().method() !== 'POST') {
                    return route.fallback();
                }
                await uploadReleased;
                return route.continue();
            });
            await dropFiles(
                frame.rawContent.locator('.cm-line').filter({ hasText: '# Title' }),
                [image],
                'bottom',
            );

            await frame.rawContent.focus();
            await page.keyboard.press('Control+Home');
            await page.keyboard.type('Note ');
            await expect(frame.rawContent).toContainText('Note # Title');
            releaseUpload();
            await expect(frame.rawChips).toHaveCount(1);

            await saveAndWait(editor);
            expect(await infoContentOf(api, definitionId)).toBe(
                `Note # Title\n\n${placedReference(image)}\n\n- one\n- two\n\nClosing text`,
            );
        });

        test('removes one of several attachments with Backspace and puts it back exactly with Undo', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const original = [
                '# Title',
                '',
                image.reference,
                '',
                '- one',
                '- two',
                '',
                other.reference,
                '',
                '```ts',
                'const a = 1;',
                '```',
                '',
                'Closing text',
            ].join('\n');
            const { editor, frame, definitionId } = await openInfoEditor(
                page,
                api,
                uniqueName('attachments-raw-undo'),
                original,
            );
            await expect(frame.rawChips).toHaveCount(2);

            await removeRawChip(frame, other);
            await expect(frame.rawChips).toHaveCount(1);
            await expect(frame.rawChips.filter({ hasText: image.fileName })).toHaveCount(1);
            await undoButton(page).click();
            await expect(frame.rawChips).toHaveCount(2);
            await expect(frame.rawChips.filter({ hasText: other.fileName })).toHaveCount(1);
            await expect(frame.rawContent).toContainText('Closing text');

            await typeAtEndOfRaw(frame, '!');
            await saveAndWait(editor);
            expect(await infoContentOf(api, definitionId)).toBe(`${original}!`);
        });

        test('refuses Undo and closes its snackbar once the text has changed after the removal', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const { editor, frame, definitionId } = await openInfoEditor(
                page,
                api,
                uniqueName('attachments-raw-undo-refused'),
                `Intro\n\n${other.reference}\n\nOutro`,
            );

            await removeRawChip(frame, other);
            await expect(frame.rawChips).toHaveCount(0);
            await expect(undoButton(page)).toBeVisible();
            await page.keyboard.type('X');

            await expect(undoButton(page)).toBeHidden();
            await saveAndWait(editor);
            expect(await infoContentOf(api, definitionId)).toBe('Intro\n\nXOutro');
        });
    });

    test.describe('Preview', () => {
        test('converts carriage return line endings to line feeds and removes the card', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const original = ['Intro', image.reference, 'Middle', other.reference, 'Outro'].join('\r\n\r\n');
            const { editor, frame, definitionId } = await openInfoEditor(
                page,
                api,
                uniqueName('attachments-preview-crlf'),
                original,
            );
            await frame.previewTab.click();
            await expect(frame.cards).toHaveCount(2);

            await removePreviewCard(frame, 1);
            await expect(frame.cards).toHaveCount(1);

            await saveAndWait(editor);
            expect(await infoContentOf(api, definitionId)).toBe(
                ['Intro', image.reference, 'Middle', 'Outro'].join('\n\n'),
            );
        });

        test('removes a card between a list and a code block and puts it back exactly with Undo', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const original = [
                '# Title',
                '',
                image.reference,
                '',
                '- one',
                '- two',
                '',
                other.reference,
                '',
                '```ts',
                'const a = 1;',
                '```',
                '',
                text.reference,
                '',
                'Closing text',
            ].join('\n');
            const { editor, frame, definitionId } = await openInfoEditor(
                page,
                api,
                uniqueName('attachments-preview-undo'),
                original,
            );
            await frame.previewTab.click();
            await expect(frame.cards).toHaveCount(3);

            await removePreviewCard(frame, 1);
            await expect(frame.cards).toHaveCount(2);
            await undoButton(page).click();
            await expect(frame.cards).toHaveCount(3);

            await frame.rawTab.click();
            await typeAtEndOfRaw(frame, '!');
            await saveAndWait(editor);
            expect(await infoContentOf(api, definitionId)).toBe(`${original}!`);
        });

        test('refuses Undo once the text has changed after the removal', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const { editor, frame, definitionId } = await openInfoEditor(
                page,
                api,
                uniqueName('attachments-preview-undo-refused'),
                `Intro\n\n${image.reference}\n\nOutro`,
            );
            await frame.previewTab.click();
            await expect(frame.cards).toHaveCount(1);

            await removePreviewCard(frame, 0);
            await expect(frame.cards).toHaveCount(0);
            await expect(undoButton(page)).toBeVisible();
            await frame.rawTab.click();
            await typeAtEndOfRaw(frame, 'X');

            await expect(undoButton(page)).toBeHidden();
            await saveAndWait(editor);
            expect(await infoContentOf(api, definitionId)).toBe('Intro\n\nOutroX');
        });

        test('removes only the list item of a card nested in a list, after repeated link definitions', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const definitions = '[x]: http://a.example\n[x]: http://b.example';
            const { editor, frame, definitionId } = await openInfoEditor(
                page,
                api,
                uniqueName('attachments-preview-list'),
                `${definitions}\n\n- one\n- ${image.reference}\n- three\n\nafter`,
            );
            await frame.previewTab.click();
            await expect(frame.cards).toHaveCount(1);

            await removePreviewCard(frame, 0);
            await expect(frame.cards).toHaveCount(0);

            await saveAndWait(editor);
            expect(await infoContentOf(api, definitionId)).toBe(`${definitions}\n\n- one\n- three\n\nafter`);
        });

        test('removes only the reference of a card nested in a blockquote, keeping the quote lines', async ({
            page,
            apiAs,
            uniqueName,
        }) => {
            const api = apiAs('trainingDesigner');
            const { editor, frame, definitionId } = await openInfoEditor(
                page,
                api,
                uniqueName('attachments-preview-quote'),
                `Intro\n\n> see ${image.reference}\n> more\n\nOutro`,
            );
            await frame.previewTab.click();
            await expect(frame.cards).toHaveCount(1);

            await removePreviewCard(frame, 0);
            await expect(frame.cards).toHaveCount(0);

            await saveAndWait(editor);
            expect(await infoContentOf(api, definitionId)).toBe('Intro\n\n> see\n> more\n\nOutro');
        });
    });
});
