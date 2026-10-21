import type { Locator, Page } from '@playwright/test';
import { control, fieldErrors, fieldInput, SentinelTable, waitForPageReady } from '../../ui';

/** The microservice overview at `/microservice`. */
export class MicroserviceOverviewPage {
    readonly table: SentinelTable;

    constructor(readonly page: Page) {
        this.table = SentinelTable.in(page);
    }

    async open(): Promise<void> {
        await this.page.goto('/microservice', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.table.waitUntilLoaded();
    }

    get registerButton(): Locator {
        return control(this.page, 'Register');
    }

    get filterInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Filter by name' });
    }

    /** Narrows the list to the microservices whose name contains the text and waits for the reload. */
    async filterBy(text: string): Promise<void> {
        await this.filterInput.fill(text);
        await this.table.waitUntilLoaded();
    }
}

/** One role card of the registration form. */
export class MicroserviceRoleCard {
    constructor(readonly root: Locator) {}

    get typeInput(): Locator {
        return fieldInput(this.root, 'Type');
    }

    get descriptionInput(): Locator {
        return fieldInput(this.root, 'Description');
    }

    get typeErrors(): Locator {
        return fieldErrors(this.root, 'Type');
    }

    get deleteButton(): Locator {
        return this.root.getByRole('button', { name: 'Delete role' });
    }

    get characterCounter(): Locator {
        return this.root.locator('mat-hint');
    }

    get clearButtons(): Locator {
        return this.root.getByRole('button', { name: /^Clear/ });
    }
}

/** The microservice registration form at `/microservice/create`. */
export class MicroserviceRegistrationPage {
    constructor(readonly page: Page) {}

    async open(): Promise<void> {
        await this.page.goto('/microservice/create', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.nameInput.waitFor();
    }

    /** Reaches the registration form as a user does, through the Register control of the overview. */
    async openFromOverview(): Promise<void> {
        const overview = new MicroserviceOverviewPage(this.page);
        await overview.open();
        await overview.registerButton.click();
        await waitForPageReady(this.page);
        await this.nameInput.waitFor();
    }

    get form(): Locator {
        return this.page.locator('crczp-microservice-edit');
    }

    get registerButton(): Locator {
        return control(this.page, 'Register');
    }

    get nameInput(): Locator {
        return fieldInput(this.form, 'Name');
    }

    get endpointInput(): Locator {
        return fieldInput(this.form, 'Endpoint');
    }

    get nameErrors(): Locator {
        return fieldErrors(this.form, 'Name');
    }

    get endpointErrors(): Locator {
        return fieldErrors(this.form, 'Endpoint');
    }

    get addRoleButton(): Locator {
        return control(this.page, 'Add role');
    }

    get roleCards(): Locator {
        return this.page.locator('crczp-microservice-role');
    }

    roleCard(index: number): MicroserviceRoleCard {
        return new MicroserviceRoleCard(this.roleCards.nth(index));
    }

    /** Fills every required field so that the Register control becomes enabled. */
    async fillValidRegistration(name: string, endpoint: string, defaultRoleType: string): Promise<void> {
        await this.nameInput.fill(name);
        await this.endpointInput.fill(endpoint);
        await this.roleCard(0).typeInput.fill(defaultRoleType);
    }
}
