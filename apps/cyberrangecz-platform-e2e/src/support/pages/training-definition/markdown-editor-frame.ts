import type { Locator, Page } from '@playwright/test';
import { pageOf } from '../../ui';
import type { AttachmentFixture } from '../../scenario/attachment-fixtures';

/** Drags files in from outside the browser onto an element, the way the OS file manager does. */
export async function dropFiles(target: Locator, files: readonly AttachmentFixture[]): Promise<void> {
    const box = await target.boundingBox();
    if (box === null) {
        throw new Error('The drop target must be visible');
    }
    const entries = files.map(({ fileName, mimeType, bytes }) => ({
        name: fileName,
        type: mimeType,
        base64: bytes.toString('base64'),
    }));
    const dataTransfer = await pageOf(target).evaluateHandle((dropped) => {
        const transfer = new DataTransfer();
        for (const { name, type, base64 } of dropped) {
            const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
            transfer.items.add(new File([bytes], name, { type }));
        }
        return transfer;
    }, entries);
    const init = { dataTransfer, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
    await target.dispatchEvent('dragenter', init);
    await target.dispatchEvent('dragover', init);
    await target.dispatchEvent('drop', init);
}

/** One markdown editor frame: the header strip, the Raw source, the Preview and the materials panel. */
export class MarkdownEditorFrame {
    readonly page: Page;

    constructor(readonly root: Locator) {
        this.page = pageOf(root);
    }

    get rawTab(): Locator {
        return this.root.getByRole('radio', { name: 'Raw' });
    }

    get previewTab(): Locator {
        return this.root.getByRole('radio', { name: 'Preview' });
    }

    get formatToolbar(): Locator {
        return this.root.locator('crczp-format-toolbar');
    }

    get materialsToggle(): Locator {
        return this.root.getByRole('button', { name: /^Training materials/ });
    }

    get expandButton(): Locator {
        return this.root.getByRole('button', { name: 'Expand editor' });
    }

    get rawContent(): Locator {
        return this.root.locator('.cm-content');
    }

    get rawChips(): Locator {
        return this.root.locator('crczp-attachment-chip .chip');
    }

    get missingRawChips(): Locator {
        return this.root.locator('crczp-attachment-chip .chip--missing');
    }

    get previewPage(): Locator {
        return this.root.locator('crczp-live-preview .preview-page');
    }

    /** The blue slot shown beside media that no text block borders; a click there starts a text block. */
    get insertSlot(): Locator {
        return this.root.locator('crczp-live-preview .preview-drop-line--insert');
    }

    /** The source editor of the Preview block open for typing. */
    get previewEditor(): Locator {
        return this.root.locator('crczp-live-preview crczp-block-source-editor .cm-content');
    }

    /** The drawn caret of the Preview block open for typing. */
    get previewCaret(): Locator {
        return this.root.locator('crczp-live-preview crczp-block-source-editor .cm-cursor');
    }

    get hairlines(): Locator {
        return this.root.getByRole('separator', { name: 'Preview width' });
    }

    get cards(): Locator {
        return this.root.locator('crczp-attachment-media');
    }

    /** The hover toolbar of the cards in Preview. */
    get cardToolbars(): Locator {
        return this.cards.locator('crczp-media-toolbar');
    }

    get missingCards(): Locator {
        return this.root.locator('crczp-missing-media');
    }

    /** The card of a file in Preview. */
    cardOf(file: AttachmentFixture): Locator {
        const rendered = {
            image: 'crczp-image-media',
            audio: 'crczp-audio-media',
            video: 'crczp-video-media',
            text: 'crczp-text-media',
            other: 'crczp-file-media',
        }[file.kind];
        const named = file.kind === 'audio' || file.kind === 'text' || file.kind === 'other';
        return named ? this.cards.locator(rendered).filter({ hasText: file.fileName }) : this.cards.locator(rendered);
    }

    /** The open materials panel, which Material renders in the page overlay. */
    get materialsPanel(): Locator {
        return this.page.locator('#materials-section-panel');
    }

    get materialRows(): Locator {
        return this.materialsPanel.locator('.panel-row');
    }

    async openMaterials(): Promise<void> {
        if (!(await this.materialsPanel.isVisible())) {
            await this.materialsToggle.click();
        }
        await this.materialsPanel.waitFor();
    }

    /** Stores files through the panel's Browse files button without placing them. */
    async browseMaterials(files: readonly AttachmentFixture[]): Promise<void> {
        await this.openMaterials();
        await this.materialsPanel.locator('input[type="file"]').setInputFiles(files.map(({ path }) => path));
    }

    /** The shared file picker of Replace and Choose a file. */
    get picker(): Locator {
        return this.page.locator('crczp-material-picker');
    }
}
