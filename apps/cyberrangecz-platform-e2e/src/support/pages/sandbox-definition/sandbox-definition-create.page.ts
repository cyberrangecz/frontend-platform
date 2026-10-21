import type { Locator, Page } from '@playwright/test';
import { control, fieldErrors, fieldInput, formField, waitForPageReady } from '../../ui';
import type { DefinitionSource } from './definition-source';

export type CreateField = 'Git URL' | 'Revision';

/** The create form at `/sandbox-definition/create`. */
export class SandboxDefinitionCreatePage {
    static readonly PATH = '/sandbox-definition/create';

    readonly createButton: Locator;

    constructor(readonly page: Page) {
        this.createButton = control(page, 'Create');
    }

    async open(): Promise<void> {
        await this.page.goto(SandboxDefinitionCreatePage.PATH, { waitUntil: 'commit' });
        await waitForPageReady(this.page);
    }

    input(field: CreateField): Locator {
        return fieldInput(this.page, field);
    }

    errors(field: CreateField): Locator {
        return fieldErrors(this.page, field);
    }

    /** The button inside the field that empties it. */
    clearButton(field: CreateField): Locator {
        return formField(this.page, field).getByRole('button', { name: 'Clear' });
    }

    async fillSource(source: DefinitionSource): Promise<void> {
        await this.input('Git URL').fill(source.url);
        await this.input('Revision').fill(source.rev);
    }

    /** Leaves a field so the form reports its validation state. */
    async touch(field: CreateField): Promise<void> {
        await this.input(field).focus();
        await this.input(field).blur();
    }
}
