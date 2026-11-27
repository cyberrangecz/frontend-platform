import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { locateChainSandbox, type ChainSandbox } from '../support/pages/pool/review-sandbox';
import { readChainRecord } from '../support/shared-fixture';
import { breadcrumbLink, dismissErrorDialogs, errorDialog, pageTitle, waitForPageReady } from '../support/ui';

test.use({ account: 'sandboxOrganizer' });

const STAGE_TITLES = [/Terraform/, /Networking Ansible/, /User Ansible/];

test.describe('pool.pool-id.sandbox-instance.request-id', () => {
    let own: ChainSandbox;

    test.beforeEach(async ({ apiAs, shared, browserKey }) => {
        own = await locateChainSandbox(apiAs('sandboxOrganizer').sandbox, shared, readChainRecord(browserKey));
    });

    function requestPath(fragment = ''): string {
        return `/pool/${own.poolId}/sandbox-instance/${own.allocationRequestId}${fragment}`;
    }

    async function openRequest(page: Page, fragment = ''): Promise<void> {
        await page.goto(requestPath(fragment));
        await waitForPageReady(page);
        await expect(selectedStage(page)).toBeVisible();
    }

    function stageIndicators(page: Page): Locator {
        return page.locator('.stage-indicators').getByRole('button');
    }

    function selectedStage(page: Page): Locator {
        return page.locator('.carousel-item[data-position="1"] crczp-request-stage');
    }

    /** Clicks a carousel card at the centre of the part of it the carousel container leaves visible. */
    async function clickCarouselCard(page: Page, position: number): Promise<void> {
        const card = page.locator(`.carousel-item[data-position="${position}"]`);
        const container = page.locator('.carousel-container');
        await container.evaluate((element) =>
            Promise.allSettled(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
        );
        const [cardBox, containerBox] = await Promise.all([card.boundingBox(), container.boundingBox()]);
        if (!cardBox || !containerBox) {
            throw new Error(`Carousel card ${position} or the carousel container is not rendered`);
        }
        const left = Math.max(cardBox.x, containerBox.x);
        const right = Math.min(cardBox.x + cardBox.width, containerBox.x + containerBox.width);
        const top = Math.max(cardBox.y, containerBox.y);
        const bottom = Math.min(cardBox.y + cardBox.height, containerBox.y + containerBox.height);
        if (right <= left || bottom <= top) {
            throw new Error(`Carousel card ${position} has no visible part inside the carousel container`);
        }
        await card.click({
            position: { x: (left + right) / 2 - cardBox.x, y: (top + bottom) / 2 - cardBox.y },
        });
    }

    test('shows the carousel of the three stages and moves between them', async ({ page, checkpoint }) => {
        test.slow();

        await test.step('shows the title, breadcrumbs and one indicator for each of the three stages', async () => {
            await openRequest(page);
            await expect.soft(pageTitle(page), 'page title').toHaveText('Allocation Request Stages');
            await expect.soft(breadcrumbLink(page, 'Allocation Request'), 'breadcrumb').toBeVisible();
            await expect.soft(stageIndicators(page), 'one indicator per stage').toHaveCount(3);
            await checkpoint(page, 'allocation request stages');
        });

        for (const [index, title] of STAGE_TITLES.entries()) {
            await test.step(`centres stage ${index + 1} with its title, order number and finished state for the fragment #stage-${index + 1}`, async () => {
                await openRequest(page, `#stage-${index + 1}`);
                const centre = selectedStage(page);
                await expect.soft(centre.getByRole('heading', { name: title }), 'stage title').toBeVisible();
                await expect
                    .soft(centre.getByRole('heading', { name: `${index + 1} / 3` }), 'order number')
                    .toBeVisible();
                await expect.soft(centre.getByRole('heading', { name: 'Finished' }), 'finished state').toBeVisible();
                await checkpoint(page, `stage ${index + 1} centred`);
            });
        }

        await test.step('moves to a stage when its indicator is clicked', async () => {
            await openRequest(page, '#stage-1');
            await stageIndicators(page).nth(2).click();
            await expect.soft(page, 'URL fragment').toHaveURL(/#stage-3$/);
            await expect
                .soft(selectedStage(page).getByRole('heading', { name: STAGE_TITLES[2]! }), 'centred stage title')
                .toBeVisible();
        });

        await test.step('moves to a neighbouring stage when its carousel card is clicked', async () => {
            await openRequest(page, '#stage-2');
            await clickCarouselCard(page, 2);
            await expect.soft(page, 'URL after the next card').toHaveURL(/#stage-3$/);
            await clickCarouselCard(page, 0);
            await expect.soft(page, 'URL after the previous card').toHaveURL(/#stage-2$/);
        });

        await test.step('hides the neighbours that do not exist at the ends of the carousel', async () => {
            await openRequest(page, '#stage-1');
            await expect
                .soft(page.locator('.carousel-item[data-position="0"]'), 'missing previous card')
                .toHaveClass(/carousel-item--hidden/);
            await expect
                .soft(page.locator('.carousel-item[data-position="2"]'), 'existing next card')
                .not.toHaveClass(/carousel-item--hidden/);
        });

        for (const { fragment, stage, description } of [
            { fragment: '#unknown', stage: 1, description: 'a fragment that is not a stage' },
            { fragment: '#stage-0', stage: 1, description: 'the fragment #stage-0' },
            { fragment: '#stage-7', stage: 3, description: 'a stage number above the stage count' },
        ]) {
            await test.step(`opens on stage ${stage} for ${description}`, async () => {
                await openRequest(page, fragment);
                await expect
                    .soft(selectedStage(page).getByRole('heading', { name: `${stage} / 3` }), 'centred stage number')
                    .toBeVisible();
            });
        }
    });

    test('moves between the stages with the keyboard', async ({ page }) => {
        test.slow();

        await test.step('cycles through the stages with the Right arrow and wraps from the last to the first', async () => {
            await openRequest(page, '#stage-1');
            await page.keyboard.press('ArrowRight');
            await expect.soft(page, 'after the first press').toHaveURL(/#stage-2$/);
            await page.keyboard.press('ArrowRight');
            await expect.soft(page, 'after the second press').toHaveURL(/#stage-3$/);
            await page.keyboard.press('ArrowRight');
            await expect.soft(page, 'after wrapping').toHaveURL(/#stage-1$/);
        });

        await test.step('cycles backwards with the Left arrow and wraps from the first to the last', async () => {
            await openRequest(page, '#stage-1');
            await page.keyboard.press('ArrowLeft');
            await expect.soft(page, 'after wrapping').toHaveURL(/#stage-3$/);
            await page.keyboard.press('ArrowLeft');
            await expect.soft(page, 'after the second press').toHaveURL(/#stage-2$/);
            await expect
                .soft(selectedStage(page).getByRole('heading', { name: '2 / 3' }), 'centred stage number')
                .toBeVisible();
        });

        await test.step('keeps the stage when an arrow is pressed together with a modifier', async () => {
            await openRequest(page, '#stage-2');
            await page.keyboard.press('Shift+ArrowRight');
            await page.keyboard.press('Alt+ArrowLeft');
            await expect.soft(page, 'stage stays').toHaveURL(/#stage-2$/);
        });

        await test.step('keeps the stage when an arrow is pressed inside the log editor', async () => {
            await openRequest(page, '#stage-2');
            await selectedStage(page).locator('.cm-content').click();
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('ArrowLeft');
            await expect.soft(page, 'stage stays').toHaveURL(/#stage-2$/);
        });

        await test.step('keeps the stage when an arrow is pressed inside the log search field', async () => {
            await openRequest(page, '#stage-2');
            await selectedStage(page).getByRole('button', { name: 'Search log', exact: true }).click();
            const field = selectedStage(page).locator('.cm-search').getByRole('textbox').first();
            await field.fill('ab');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowRight');
            await expect.soft(field, 'search field keeps focus').toBeFocused();
            await expect.soft(page, 'stage stays').toHaveURL(/#stage-2$/);
        });

        await test.step('keeps the stage when an arrow is pressed inside a text field', async () => {
            await openRequest(page, '#stage-2');
            await page.evaluate(() => {
                const field = document.createElement('input');
                field.id = 'arrow-probe';
                document.body.appendChild(field);
                field.focus();
            });
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('ArrowLeft');
            await expect.soft(page, 'stage stays').toHaveURL(/#stage-2$/);
        });
    });

    test('shows the stage information and the log output of a finished stage', async ({ page }) => {
        test.slow();
        await page.addInitScript(() => {
            (window as unknown as { openedUrls: unknown[][] }).openedUrls = [];
            window.open = (...args: unknown[]) => {
                (window as unknown as { openedUrls: unknown[][] }).openedUrls.push(args);
                return null;
            };
        });

        await test.step('expands and collapses the start, end and duration under the stage title', async () => {
            await openRequest(page, '#stage-1');
            const centre = selectedStage(page);
            await centre.getByRole('button').first().click();
            for (const tooltip of ['double_arrow', 'stop_circle', 'schedule']) {
                await expect
                    .soft(centre.locator('.allocation-info mat-icon', { hasText: tooltip }), `${tooltip} icon`)
                    .toBeVisible();
            }
            await centre.getByRole('button').first().click();
            await expect.soft(centre.locator('.allocation-info'), 'collapsed information').toHaveCount(0);
        });

        await test.step('collapses the information when the page is clicked elsewhere', async () => {
            await openRequest(page, '#stage-1');
            const centre = selectedStage(page);
            await centre.getByRole('button').first().click();
            await expect.soft(centre.locator('.allocation-info'), 'expanded information').toBeVisible();
            await pageTitle(page).click();
            await expect.soft(centre.locator('.allocation-info'), 'collapsed information').toHaveCount(0);
        });

        await test.step('shows the Ansible revision and repository link on the Ansible stages and opens the repository in a new tab', async () => {
            await openRequest(page, '#stage-2');
            const centre = selectedStage(page);
            await centre.getByRole('button').first().click();
            await expect
                .soft(centre.locator('.allocation-info mat-icon', { hasText: 'commit' }), 'revision icon')
                .toBeVisible();
            const link = centre.locator('.allocation-info a.repo-link');
            await expect.soft(link, 'repository link').toBeVisible();
            const address = await link.getAttribute('href');
            await link.click();
            const opened = await page.evaluate(
                () => (window as unknown as { openedUrls: unknown[][] }).openedUrls,
            );
            expect.soft(opened, 'window.open calls').toEqual([[address, '_blank', 'noopener']]);
            await expect.soft(page, 'stage stays').toHaveURL(/#stage-2$/);
        });

        await test.step('shows no repository link on the Terraform stage', async () => {
            await openRequest(page, '#stage-1');
            const centre = selectedStage(page);
            await centre.getByRole('button').first().click();
            await expect.soft(centre.locator('.allocation-info a.repo-link'), 'repository link').toHaveCount(0);
        });

        await test.step('shows the log output of a finished stage', async () => {
            await openRequest(page, '#stage-1');
            await expect.soft(selectedStage(page).locator('crczp-log-view'), 'log view').toBeVisible();
        });
    });

    test.describe('loading failure', () => {
        test('shows the load error card and recovers through its refresh button', async ({ page, checkpoint }) => {
            await page.route('**/allocation-requests/*/stages/**', (route) =>
                route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
            );
            await page.goto(requestPath('#stage-1'));
            await expect(page.getByText('We had some trouble loading the data.')).toBeVisible();
            await checkpoint(page, 'stage load error');
            await page.unroute('**/allocation-requests/*/stages/**');
            await expect(errorDialog(page).first()).toBeVisible();
            expect(await dismissErrorDialogs(page), 'error dialogs closed').toBeGreaterThan(0);
            await page.locator('mat-card.error').getByRole('button').click();
            await expect(page.getByText('We had some trouble loading the data.')).toHaveCount(0);
            await expect(selectedStage(page)).toBeVisible();
        });
    });
});
