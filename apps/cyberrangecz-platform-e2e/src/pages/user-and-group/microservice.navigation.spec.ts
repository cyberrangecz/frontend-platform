import { expect, test } from '../../support/fixtures';
import { HomePage } from '../../support/pages/common/home.page';
import { AGENDAS } from '../../support/pages/common/role-agendas';
import {
    breadcrumbEntries,
    breadcrumbLink,
    expectUrlWhileLoading,
    navigationEntryByPath,
    pageTitle,
    waitForPageReady,
} from '../../support/ui';

test.use({ origin: 'deployed', account: 'userAdministrator' });

const agenda = AGENDAS.microservices;

test.describe('microservice.navigation', () => {
    test(`the ${agenda.homeLabel} link opens a page the role can use`, async ({ page, checkpoint }) => {
        const home = new HomePage(page);
        await home.open();
        await home.linkButton(agenda.homeLabel).click();
        await expectUrlWhileLoading(page, new RegExp(`${agenda.path}$`));
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(agenda.pageTitle);
        await checkpoint(page, agenda.homeLabel);
    });

    test(`the ${agenda.navigationGroup} / ${agenda.navigationLabel} entry opens its page`, async ({ page }) => {
        await page.goto('/home');
        await waitForPageReady(page);
        await navigationEntryByPath(page, agenda.path).click();
        await expectUrlWhileLoading(page, new RegExp(`${agenda.path}$`));
        await waitForPageReady(page);
        await expect(pageTitle(page)).toHaveText(agenda.pageTitle);
    });

    test(`shows the breadcrumbs Home / ${agenda.breadcrumbLabel} on ${agenda.path}`, async ({ page }) => {
        await page.goto(agenda.path);
        await waitForPageReady(page);
        await expect(breadcrumbEntries(page)).toHaveText([/^Home/, agenda.breadcrumbLabel]);
        await expect(breadcrumbLink(page, 'Home')).toHaveAttribute('href', '/');
    });
});
