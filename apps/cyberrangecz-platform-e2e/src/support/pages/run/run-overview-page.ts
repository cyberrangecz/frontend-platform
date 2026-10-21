import type { Locator, Page } from '@playwright/test';
import { control, SentinelTable, waitForPageReady } from '../../ui';

type TokenField = 'prefix' | 'pin';

const FIELD_LABELS: Record<TokenField, string> = {
    prefix: 'Access Token Prefix',
    pin: 'Access Token PIN',
};

/** The trainee's `/run` page: the access token form above the table of the trainee's own runs. */
export class RunOverviewPage {
    readonly table: SentinelTable;

    constructor(readonly page: Page) {
        this.table = SentinelTable.in(page);
    }

    /** Opens the page and waits until the run table shows rows or its empty state. */
    async open(): Promise<void> {
        await this.page.goto('/run', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.table.waitUntilLoaded();
    }

    get accessCard(): Locator {
        return this.page.locator('crczp-access-training-run');
    }

    get prefixInput(): Locator {
        return this.inputOf('prefix');
    }

    get pinInput(): Locator {
        return this.inputOf('pin');
    }

    get accessButton(): Locator {
        return this.accessCard.getByRole('button', { name: 'Access', exact: true });
    }

    get fieldErrors(): Locator {
        return this.accessCard.locator('mat-error');
    }

    get mitreControl(): Locator {
        return control(this.page, 'MITRE ATT&CK Techniques');
    }

    /** The Clear button of an access token field. */
    clearButtonOf(field: TokenField): Locator {
        return this.accessCard
            .locator('mat-form-field')
            .filter({ has: this.page.getByRole('textbox', { name: FIELD_LABELS[field] }) })
            .getByRole('button', { name: 'Clear' });
    }

    async fillToken(prefix: string, pin: string): Promise<void> {
        await this.prefixInput.fill(prefix);
        await this.pinInput.fill(pin);
    }

    /** Types the two halves of a full access token, split at its last dash, into the prefix and PIN fields. */
    async fillTokenText(token: string): Promise<void> {
        const separator = token.lastIndexOf('-');
        await this.fillToken(token.slice(0, separator), token.slice(separator + 1));
    }

    /** Focuses a field and leaves it, so its validation messages show. */
    async touch(field: TokenField): Promise<void> {
        const input = this.inputOf(field);
        await input.focus();
        await input.blur();
    }

    /** Puts the text on the clipboard and pastes it into a field with Ctrl+V. */
    async paste(field: TokenField, text: string): Promise<void> {
        const input = this.inputOf(field);
        await input.focus();
        await this.page.evaluate((copied) => navigator.clipboard.writeText(copied), text);
        await this.page.keyboard.press('Control+V');
    }

    /** The table row of the run whose training instance has the given title. */
    rowOf(instanceTitle: string): Locator {
        return this.table.rowByText(instanceTitle);
    }

    /** The row's Resume action (icon-only button). */
    resumeAction(row: Locator): Locator {
        return this.table.rowAction(row, 'open_in_new');
    }

    /** The row's Access Results action (icon-only button). */
    resultsAction(row: Locator): Locator {
        return this.table.rowAction(row, 'assessment');
    }

    private inputOf(field: TokenField): Locator {
        return this.accessCard.getByRole('textbox', { name: FIELD_LABELS[field] });
    }
}
