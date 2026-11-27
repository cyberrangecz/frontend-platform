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

const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;

test.describe('home', () => {
    for (const role of MULTI_AGENDA_ROLES) {
        test.describe(`as ${role}`, () => {
            test.use({ account: role });
            const agendas = agendasOf(role);
            const categories = CATEGORY_ORDER.filter((category) =>
                agendas.some((agenda) => agenda.homeCategory === category),
            );

            test('home page', async ({ page, checkpoint }) => {
                test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
                const home = new HomePage(page);
                const [first] = agendas;
                await home.open();

                await test.step('stays on the home page and shows the portal heading', async () => {
                    await expect.soft(page, 'address of the home page').toHaveURL(/\/home$/);
                    await expect.soft(home.heading, 'portal heading').toBeVisible();
                    await checkpoint(page, 'home');
                });

                await test.step('shows exactly the agenda categories of the role, in portal order', async () => {
                    await expect.soft(home.categoryHeadings, 'category headings').toHaveText(categories);
                });

                await test.step('shows exactly the agenda links of the role', async () => {
                    await expect.soft(home.linkLabels, 'agenda link labels').toHaveText(
                        CATEGORY_ORDER.flatMap((category) =>
                            agendas
                                .filter((agenda) => agenda.homeCategory === category)
                                .map((agenda) => agenda.homeLabel),
                        ),
                    );
                });

                await test.step('lists each link under its own category', async () => {
                    for (const agenda of agendas) {
                        await expect
                            .soft(
                                home
                                    .category(agenda.homeCategory)
                                    .getByRole('heading', { level: 3, name: agenda.homeLabel, exact: true }),
                                `${agenda.homeLabel} under ${agenda.homeCategory}`,
                            )
                            .toBeVisible();
                    }
                });

                await test.step('shows no link to an agenda the role cannot open', async () => {
                    const labelsOfRole = agendas.map((agenda) => agenda.homeLabel);
                    for (const key of ALL_AGENDAS) {
                        if (!labelsOfRole.includes(AGENDAS[key].homeLabel)) {
                            await expect
                                .soft(home.linkItem(AGENDAS[key].homeLabel), `no ${AGENDAS[key].homeLabel} link`)
                                .toHaveCount(0);
                        }
                    }
                });

                await test.step('describes every link in its category', async () => {
                    for (const category of categories) {
                        const linkCount = agendas.filter((agenda) => agenda.homeCategory === category).length;
                        await expect
                            .soft(
                                home.category(category).locator('crczp-portal-agenda-description'),
                                `descriptions in ${category}`,
                            )
                            .toHaveCount(linkCount);
                        for (let index = 0; index < linkCount; index++) {
                            await expect
                                .soft(home.descriptionIn(category, index), `description ${index} in ${category}`)
                                .not.toHaveText('');
                        }
                    }
                });

                await test.step('elevates a description while its link is hovered', async () => {
                    await home.linkButton(first!.homeLabel).hover();
                    await expect
                        .soft(home.descriptionIn(first!.homeCategory, 0), 'description while its link is hovered')
                        .toHaveClass(/text-elevation/);
                    await page.mouse.move(0, 0);
                    await expect
                        .soft(home.descriptionIn(first!.homeCategory, 0), 'description after the hover ends')
                        .not.toHaveClass(/text-elevation/);
                });

                await test.step('highlights a link while its description is hovered', async () => {
                    await home.descriptionIn(first!.homeCategory, 0).hover();
                    await expect
                        .soft(home.linkButton(first!.homeLabel), 'link while its description is hovered')
                        .toHaveClass(/button-highlight/);
                    await page.mouse.move(0, 0);
                    await expect
                        .soft(home.linkButton(first!.homeLabel), 'link after the hover ends')
                        .not.toHaveClass(/button-highlight/);
                });

                for (const agenda of agendas.filter((candidate) => !isDeployedOriginAgenda(candidate))) {
                    await test.step(`the ${agenda.homeLabel} link opens a page the role can use`, async () => {
                        await home.open();
                        await home.linkButton(agenda.homeLabel).click();
                        await expectUrlWhileLoading(page, new RegExp(`${agenda.path}$`));
                        await waitForPageReady(page);
                        await expect
                            .soft(pageTitle(page), `page title of ${agenda.path}`)
                            .toHaveText(agenda.pageTitle);
                        await checkpoint(page, agenda.homeLabel);
                    });
                }
            });
        });
    }

    test.describe('as trainee', () => {
        test.use({ account: 'trainee' });

        test('home redirects', async ({ page }) => {
            test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);

            await test.step('redirects the home page to the only agenda, the training runs', async () => {
                await page.goto('/home');
                await expectUrlWhileLoading(page, /\/run$/);
                await waitForPageReady(page);
                await expect.soft(pageTitle(page), 'page title of the training runs').toHaveText('Training Run Overview');
            });

            await test.step('redirects the application root to the only agenda', async () => {
                await page.goto('/');
                await expectUrlWhileLoading(page, /\/run$/);
            });

            await test.step('the breadcrumb home link leads on to the only agenda', async () => {
                await page.goto('/mitre-techniques');
                await waitForPageReady(page);
                await page.locator('sentinel-breadcrumbs').getByRole('link', { name: 'Home' }).click();
                await expectUrlWhileLoading(page, /\/run$/);
            });
        });
    });
});
