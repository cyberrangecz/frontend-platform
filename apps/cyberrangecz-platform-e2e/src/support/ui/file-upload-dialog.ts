import type { Locator, Page } from '@playwright/test';

/**
 * The file upload dialog (`crczp-file-upload-dialog`): a title, an optional subtitle, a drop zone
 * with a hidden file input, and Cancel and Confirm buttons. Confirm stays disabled until a file
 * is chosen.
 */
export class FileUploadDialog {
    /** The dialog element. */
    readonly root: Locator;

    constructor(page: Page) {
        this.root = page.getByRole('dialog').filter({ has: page.locator('ngx-file-drag-drop') });
    }

    /** The dialog's heading. */
    get title(): Locator {
        return this.root.getByRole('heading').first();
    }

    /** The drop zone. */
    get dropZone(): Locator {
        return this.root.locator('ngx-file-drag-drop');
    }

    /** The files currently chosen, one chip each. */
    get chosenFiles(): Locator {
        return this.dropZone.locator('mat-chip');
    }

    /** The Cancel button. */
    get cancelButton(): Locator {
        return this.root.getByRole('button', { name: 'Cancel', exact: true });
    }

    /** The Confirm button. */
    get confirmButton(): Locator {
        return this.root.getByRole('button', { name: 'Confirm', exact: true });
    }

    /** Chooses files by path or in-memory content through the drop zone's file input. */
    async chooseFiles(files: Parameters<Locator['setInputFiles']>[0]): Promise<void> {
        await this.dropZone.locator('input[type="file"]').setInputFiles(files);
    }
}
