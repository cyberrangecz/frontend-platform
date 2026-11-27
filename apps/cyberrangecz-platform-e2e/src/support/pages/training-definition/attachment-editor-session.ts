import type { Page } from '@playwright/test';
import { expect } from '../../fixtures';
import type { Api } from '../../api/api-client';
import type { AttachmentFixture } from '../../scenario/attachment-fixtures';
import { waitForNotification } from '../../ui';
import { DefinitionEditorPage } from './definition-editor.page';
import { MarkdownEditorFrame } from './markdown-editor-frame';
import { definitionWithInfoLevel, fetchDefinition, importDefinitionBody } from './training-definition-data';

/** A definition's info level opened in its Raw source. */
export interface OpenedInfoEditor {
    editor: DefinitionEditorPage;
    frame: MarkdownEditorFrame;
    definitionId: number;
}

/** The markdown content of the first level of a definition, as the server stores it. */
export async function infoContentOf(api: Api, definitionId: number): Promise<string> {
    const level = (await fetchDefinition(api, definitionId)).levels?.[0];
    return String(level?.['content'] ?? '');
}

/** The markdown editor frame of the info level that is open. */
export function frameOf(editor: DefinitionEditorPage): MarkdownEditorFrame {
    return new MarkdownEditorFrame(editor.infoLevel.root.locator('crczp-markdown-editor-frame').first());
}

/** Opens the edit page of a definition with its first level in the Raw source. */
export async function openExisting(page: Page, definitionId: number): Promise<OpenedInfoEditor> {
    const editor = new DefinitionEditorPage(page);
    await editor.gotoEdit(definitionId);
    await editor.openLevel(0);
    const frame = frameOf(editor);
    await frame.rawTab.click();
    await expect(frame.rawTab).toBeChecked();
    await expect(frame.rawContent).toBeVisible();
    return { editor, frame, definitionId };
}

/** Imports a definition with one info level holding the content, stored files given on top, and opens it in the Raw source. */
export async function openInfoEditor(
    page: Page,
    api: Api,
    title: string,
    content: string,
    files: readonly AttachmentFixture[] = [],
): Promise<OpenedInfoEditor> {
    const definition = await importDefinitionBody(api, definitionWithInfoLevel(title, content), files);
    return openExisting(page, definition.id);
}

/** Saves the definition and waits for the saved notification. */
export async function saveAndWait(editor: DefinitionEditorPage): Promise<void> {
    await expect(editor.saveButton).toBeEnabled();
    await editor.saveButton.click();
    await waitForNotification(editor.page, /saved/i);
}
