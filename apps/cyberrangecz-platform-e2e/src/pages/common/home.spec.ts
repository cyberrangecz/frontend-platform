import { expect, test } from '../../support/fixtures';
import { HomePage } from '../../support/pages/common/home.page';
import {
    AGENDAS,
    agendasOf,
    ALL_AGENDAS,
    isDeployedOriginAgenda,
    MULTI_AGENDA_ROLES,
    type HomeCategory,
} from '../../support/pages/common/role-agendas';
import { expectUrlWhileLoading, pageTitle, waitForPageReady } from '../../support/ui';

const CATEGORY_ORDER: HomeCategory[] = ['Participate', 'Design', 'Organize', 'Manage'];

test.describe('home', () => {
    for (const role of MULTI_AGENDA_ROLES) {
        test.describe(`as ${role}`, () => {
            test.use({ account: role });
            const agendas = agendasOf(role);
            const categories = CATEGORY_ORDER.filter((category) =>
                agendas.some((agenda) => agenda.homeCategory === category),
            );

            test('stays on the home page and shows the portal heading', async ({ page, checkpoint }) => {
                const home = new HomePage(page);
                await home.open();
                await expect(page).toHaveURL(/\/home$/);
                await expect(home.heading).toBeVisible();
                await checkpoint(page, 'home');
            });

            test('shows exactly the agenda categories of the role, in portal order', async ({ page }) => {
                const home = new HomePage(page);
                await home.open();
                await expect(home.categoryHeadings).toHaveText(categories);
            });

            test('shows exactly the agenda links of the role', async ({ page }) => {
                const home = new HomePage(page);
                await home.open();
                await expect(home.linkLabels).toHaveText(
                    CATEGORY_ORDER.flatMap((category) =>
                        agendas
                            .filter((agenda) => agenda.homeCategory === category)
                            .map((agenda) => agenda.homeLabel),
                    ),
                );
            });

            test('lists each link under its own category', async ({ page }) => {
                const home = new HomePage(page);
                await home.open();
                for (const agenda of agendas) {
                    await expect(home.category(agenda.homeCategory).getByRole('heading', { level: 3, name: agenda.homeLabel, exact: true })).toBeVisible();
                }
            });

            test('shows no link to an agenda the role cannot open', async ({ page }) => {
                const home = new HomePage(page);
                await home.open();
                const labelsOfRole = agendas.map((agenda) => agenda.homeLabel);
                for (const key of ALL_AGENDAS) {
                    if (!labelsOfRole.includes(AGENDAS[key].homeLabel)) {
                        await expect(home.linkItem(AGENDAS[key].homeLabel)).toHaveCount(0);
                    }
                }
            });

            test('describes every link in its category', async ({ page }) => {
                const home = new HomePage(page);
                await home.open();
                for (const category of categories) {
                    const linkCount = agendas.filter((agenda) => agenda.homeCategory === category).length;
                    await expect(home.category(category).locator('crczp-portal-agenda-description')).toHaveCount(linkCount);
                    for (let index = 0; index < linkCount; index++) {
                        await expect(home.descriptionIn(category, index)).not.toHaveText('');
                    }
                }
            });

            test('elevates a description while its link is hovered', async ({ page }) => {
                const home = new HomePage(page);
                await home.open();
                const [first] = agendas;
                await home.linkButton(first!.homeLabel).hover();
                await expect(home.descriptionIn(first!.homeCategory, 0)).toHaveClass(/text-elevation/);
                await page.mouse.move(0, 0);
                await expect(home.descriptionIn(first!.homeCategory, 0)).not.toHaveClass(/text-elevation/);
            });

            test('highlights a link while its description is hovered', async ({ page }) => {
                const home = new HomePage(page);
                await home.open();
                const [first] = agendas;
                await home.descriptionIn(first!.homeCategory, 0).hover();
                await expect(home.linkButton(first!.homeLabel)).toHaveClass(/button-highlight/);
                await page.mouse.move(0, 0);
                await expect(home.linkButton(first!.homeLabel)).not.toHaveClass(/button-highlight/);
            });

            for (const agenda of agendas.filter((candidate) => !isDeployedOriginAgenda(candidate))) {
                test(`the ${agenda.homeLabel} link opens a page the role can use`, async ({ page, checkpoint }) => {
                    const home = new HomePage(page);
                    await home.open();
                    await home.linkButton(agenda.homeLabel).click();
                    await expectUrlWhileLoading(page, new RegExp(`${agenda.path}$`));
                    await waitForPageReady(page);
                    await expect(pageTitle(page)).toHaveText(agenda.pageTitle);
                    await checkpoint(page, agenda.homeLabel);
                });
            }
        });
    }

    test.describe('as trainee', () => {
        test.use({ account: 'trainee' });

        test('redirects the home page to the only agenda, the training runs', async ({ page }) => {
            await page.goto('/home');
            await expectUrlWhileLoading(page, /\/run$/);
            await waitForPageReady(page);
            await expect(pageTitle(page)).toHaveText('Training Run Overview');
        });

        test('redirects the application root to the only agenda', async ({ page }) => {
            await page.goto('/');
            await expectUrlWhileLoading(page, /\/run$/);
        });

        test('the breadcrumb home link leads on to the only agenda', async ({ page }) => {
            await page.goto('/mitre-techniques');
            await waitForPageReady(page);
            await page.locator('sentinel-breadcrumbs').getByRole('link', { name: 'Home' }).click();
            await expectUrlWhileLoading(page, /\/run$/);
        });
    });
});
