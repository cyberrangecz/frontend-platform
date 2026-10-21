import type { Locator, Page } from '@playwright/test';
import { waitForPageReady } from '../../ui';

/** The portal landing page: category rows, each with agenda link buttons and their descriptions. */
export class HomePage {
    constructor(readonly page: Page) {}

    async open(): Promise<void> {
        await this.page.goto('/home', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
    }

    get heading(): Locator {
        return this.page.getByRole('heading', { level: 1, name: /Platform Portal/ });
    }

    /** Category headings in page order. */
    get categoryHeadings(): Locator {
        return this.page.locator('crczp-portal-agenda-container').getByRole('heading', { level: 2 });
    }

    category(label: string): Locator {
        return this.page
            .locator('crczp-portal-agenda-container')
            .filter({ has: this.page.getByRole('heading', { level: 2, name: label, exact: true }) });
    }

    /** Labels of every agenda link of the page, in page order. */
    get linkLabels(): Locator {
        return this.page.locator('crczp-portal-agenda-link').getByRole('heading', { level: 3 });
    }

    linkItem(label: string): Locator {
        return this.page.locator('crczp-portal-agenda-link').filter({
            has: this.page.getByRole('heading', { level: 3, name: label, exact: true }),
        });
    }

    linkButton(label: string): Locator {
        return this.linkItem(label).getByRole('button');
    }

    /** The description text of the link at a position inside its category. */
    descriptionIn(category: string, index: number): Locator {
        return this.category(category).locator('crczp-portal-agenda-description .text-reactive').nth(index);
    }
}
