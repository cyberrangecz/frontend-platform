import type { Locator, Page } from '@playwright/test';
import { control, fieldErrors, fieldInput, waitForPageReady, waitWhileLoading } from '../../ui';

/** The pool form of `/pool/create` and `/pool/:poolId/edit`. */
export class PoolFormPage {
    constructor(readonly page: Page) {}

    async open(path: string): Promise<void> {
        await this.page.goto(path);
        await waitForPageReady(this.page);
        await waitWhileLoading(this.sizeInput);
    }

    get sizeInput(): Locator {
        return fieldInput(this.page, 'Sandbox Pool Size');
    }

    get sizeErrors(): Locator {
        return fieldErrors(this.page, 'Sandbox Pool Size');
    }

    get definitionSelect(): Locator {
        return this.page.getByRole('combobox', { name: 'Sandbox Definition' });
    }

    get commentInput(): Locator {
        return fieldInput(this.page, 'Comment');
    }

    get notifyCheckbox(): Locator {
        return this.page.getByRole('checkbox', { name: 'Send e-mail notifications upon build progression' });
    }

    /** The submit button: Create on the creation form, Save on the edit form. */
    submitButton(label: 'Create' | 'Save'): Locator {
        return control(this.page, label);
    }

    /** Types into the size field and leaves it, so its validation messages show. */
    async enterSize(text: string): Promise<void> {
        await this.sizeInput.fill(text);
        await this.sizeInput.blur();
    }

    async chooseDefinition(label: string): Promise<void> {
        await this.definitionSelect.click();
        await this.page.getByRole('option', { name: label, exact: true }).first().click();
    }
}
