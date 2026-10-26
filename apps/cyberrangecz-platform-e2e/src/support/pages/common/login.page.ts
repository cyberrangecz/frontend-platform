import type { Locator, Page } from '@playwright/test';

/** The sign-in page: the provider list and the access consent notice. */
export class LoginPage {
    constructor(readonly page: Page) {}

    async open(): Promise<void> {
        await this.page.goto('/login');
    }

    get heading(): Locator {
        return this.page.getByRole('heading', { name: 'Login', exact: true });
    }

    get providerButton(): Locator {
        return this.page.getByRole('button', { name: 'Login with local Keycloak' });
    }

    get consentCard(): Locator {
        return this.page.locator('mat-card').filter({ hasText: 'Access consent' });
    }

    get consentAddress(): Locator {
        return this.consentCard.getByRole('link', { name: 'info@cyberrange.cz' });
    }
}
