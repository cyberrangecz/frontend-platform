import type { Locator, Page } from '@playwright/test';
import { bulkDeleteControl, control } from './sentinel-controls';
import { SentinelTable } from './sentinel-table';
import type { Scope, TextMatcher } from './scope';

/**
 * The `sentinel-user-assign` component of the definition and instance editors, which adds users
 * as designers or organizers and removes them again. The upper half searches users and adds the
 * chosen ones with Add; the lower half lists the assigned users in a table, whose selected rows
 * Delete removes.
 */
export class UserAssign {
    /** The `sentinel-user-assign` element. */
    readonly root: Locator;

    constructor(root: Locator) {
        this.root = root;
    }

    /** Finds the component within a scope. */
    static in(scope: Scope): UserAssign {
        return new UserAssign(scope.locator('sentinel-user-assign').first());
    }

    /** The search input of the users that can be added. */
    get searchInput(): Locator {
        return this.root.locator('sentinel-resource-selector input');
    }

    /** The suggestion of the open search list whose text (name and login) matches. */
    candidate(page: Page, text: TextMatcher): Locator {
        return page.getByRole('option', { name: text }).first();
    }

    /** The Add button, disabled while no candidate is chosen. */
    get addButton(): Locator {
        return control(this.root, 'Add');
    }

    /** The Delete button, labelled with the selection size once rows are selected. */
    get deleteButton(): Locator {
        return bulkDeleteControl(this.root);
    }

    /** The table of users assigned to the resource. */
    get assignedTable(): SentinelTable {
        return SentinelTable.in(this.root);
    }

    /** Searches for a user, ticks the suggestion that matches, and closes the suggestion list. */
    async chooseCandidate(page: Page, search: string, candidateText: TextMatcher = search): Promise<void> {
        await this.searchInput.scrollIntoViewIfNeeded();
        await this.searchInput.fill(search);
        await this.candidate(page, candidateText).click();
        await page.keyboard.press('Escape');
    }

    /** Adds the chosen candidates to the resource. */
    async addChosen(): Promise<void> {
        await this.addButton.click();
    }

    /** Selects the assigned user whose row text matches and removes the selection. */
    async removeAssigned(text: TextMatcher): Promise<void> {
        const table = this.assignedTable;
        await table.rowCheckbox(table.rowByText(text)).check();
        await this.deleteButton.click();
    }
}
