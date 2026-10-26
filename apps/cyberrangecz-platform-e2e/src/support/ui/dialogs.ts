import type { Locator, Page } from '@playwright/test';
import type { TextMatcher } from './scope';

/** The open Material dialogs of a page, narrowed by title text when given. */
export function openDialog(page: Page, title?: TextMatcher): Locator {
    const dialogs = page.getByRole('dialog');
    return title === undefined
        ? dialogs
        : dialogs.filter({ has: page.getByRole('heading', { name: title }) });
}

/** The heading of a dialog. */
export function dialogTitle(dialog: Locator): Locator {
    return dialog.getByRole('heading').first();
}

/** A button of a dialog, located by its label. */
export function dialogButton(dialog: Locator, label: TextMatcher): Locator {
    return dialog.getByRole('button', { name: label, exact: typeof label === 'string' });
}

/**
 * The platform's confirmation dialog (Sentinel confirmation dialog): a title, a message paragraph,
 * a cancel button on the left and a confirm button on the right. The two buttons carry labels the
 * opening code chooses, so they are addressed by position.
 */
export class ConfirmationDialog {
    /** The dialog element. */
    readonly root: Locator;

    constructor(page: Page, title?: TextMatcher) {
        this.root = openDialog(page, title);
    }

    /** The dialog's heading. */
    get title(): Locator {
        return dialogTitle(this.root);
    }

    /** The paragraph that asks the question. */
    get message(): Locator {
        return this.root.locator('mat-dialog-content p, .mat-mdc-dialog-content p');
    }

    /** The left button, which dismisses the dialog. */
    get cancelButton(): Locator {
        return this.root.locator('.mat-mdc-dialog-actions button').first();
    }

    /** The right button, which carries out the action. */
    get confirmButton(): Locator {
        return this.root.locator('.mat-mdc-dialog-actions button').last();
    }

    /** Clicks the confirm button. */
    async confirm(): Promise<void> {
        await this.confirmButton.click();
    }

    /** Clicks the cancel button. */
    async cancel(): Promise<void> {
        await this.cancelButton.click();
    }
}
