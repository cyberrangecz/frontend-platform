import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import { POOL_LINKS, ROLES_WITHOUT_POOL_ACCESS } from '../support/pages/pool/pool-access';
import { expectRedirectedAway } from '../support/route-guard';
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

    test('shows the title, breadcrumbs and one indicator for each of the three stages', async ({
        page,
        checkpoint,
    }) => {
        await openRequest(page);
        await expect(pageTitle(page)).toHaveText('Allocation Request Stages');
        await expect(breadcrumbLink(page, 'Allocation Request')).toBeVisible();
        await expect(stageIndicators(page)).toHaveCount(3);
        await checkpoint(page, 'allocation request stages');
    });

    for (const [index, title] of STAGE_TITLES.entries()) {
        test(`centres stage ${index + 1} with its title, order number and finished state for the fragment #stage-${index + 1}`, async ({
            page,
            checkpoint,
        }) => {
            await openRequest(page, `#stage-${index + 1}`);
            const centre = selectedStage(page);
            await expect(centre.getByRole('heading', { name: title })).toBeVisible();
            await expect(centre.getByRole('heading', { name: `${index + 1} / 3` })).toBeVisible();
            await expect(centre.getByRole('heading', { name: 'Finished' })).toBeVisible();
            await checkpoint(page, `stage ${index + 1} centred`);
        });
    }

    test('moves to a stage when its indicator is clicked', async ({ page }) => {
        await openRequest(page, '#stage-1');
        await stageIndicators(page).nth(2).click();
        await expect(page).toHaveURL(/#stage-3$/);
        await expect(selectedStage(page).getByRole('heading', { name: STAGE_TITLES[2]! })).toBeVisible();
    });

    test('moves to a neighbouring stage when its carousel card is clicked', async ({ page }) => {
        await openRequest(page, '#stage-2');
        await clickCarouselCard(page, 2);
        await expect(page).toHaveURL(/#stage-3$/);
        await clickCarouselCard(page, 0);
        await expect(page).toHaveURL(/#stage-2$/);
    });

    test('hides the neighbours that do not exist at the ends of the carousel', async ({ page }) => {
        await openRequest(page, '#stage-1');
        await expect(page.locator('.carousel-item[data-position="0"]')).toHaveClass(/carousel-item--hidden/);
        await expect(page.locator('.carousel-item[data-position="2"]')).not.toHaveClass(/carousel-item--hidden/);
    });

    test('cycles through the stages with the Tab key and wraps from the last to the first', async ({ page }) => {
        await openRequest(page, '#stage-1');
        await page.keyboard.press('Tab');
        await expect(page).toHaveURL(/#stage-2$/);
        await page.keyboard.press('Tab');
        await expect(page).toHaveURL(/#stage-3$/);
        await page.keyboard.press('Tab');
        await expect(page).toHaveURL(/#stage-1$/);
    });

    for (const { fragment, stage, description } of [
        { fragment: '#unknown', stage: 1, description: 'a fragment that is not a stage' },
        { fragment: '#stage-0', stage: 1, description: 'the fragment #stage-0' },
        { fragment: '#stage-7', stage: 3, description: 'a stage number above the stage count' },
    ]) {
        test(`opens on stage ${stage} for ${description}`, async ({ page }) => {
            await openRequest(page, fragment);
            await expect(selectedStage(page).getByRole('heading', { name: `${stage} / 3` })).toBeVisible();
        });
    }

    test.describe('stage information', () => {
        test('expands and collapses the start, end and duration under the stage title', async ({ page }) => {
            await openRequest(page, '#stage-1');
            const centre = selectedStage(page);
            await centre.getByRole('button').first().click();
            for (const tooltip of ['double_arrow', 'stop_circle', 'schedule']) {
                await expect(centre.locator('.allocation-info mat-icon', { hasText: tooltip })).toBeVisible();
            }
            await centre.getByRole('button').first().click();
            await expect(centre.locator('.allocation-info')).toHaveCount(0);
        });

        test('collapses the information when the page is clicked elsewhere', async ({ page }) => {
            await openRequest(page, '#stage-1');
            const centre = selectedStage(page);
            await centre.getByRole('button').first().click();
            await expect(centre.locator('.allocation-info')).toBeVisible();
            await pageTitle(page).click();
            await expect(centre.locator('.allocation-info')).toHaveCount(0);
        });

        test('shows the Ansible revision and repository link on the Ansible stages and opens the repository in a new tab', async ({
            page,
        }) => {
            await page.addInitScript(() => {
                (window as unknown as { openedUrls: unknown[][] }).openedUrls = [];
                window.open = (...args: unknown[]) => {
                    (window as unknown as { openedUrls: unknown[][] }).openedUrls.push(args);
                    return null;
                };
            });
            await openRequest(page, '#stage-2');
            const centre = selectedStage(page);
            await centre.getByRole('button').first().click();
            await expect(centre.locator('.allocation-info mat-icon', { hasText: 'commit' })).toBeVisible();
            const link = centre.locator('.allocation-info a.repo-link');
            await expect(link).toBeVisible();
            const address = await link.getAttribute('href');
            await link.click();
            const opened = await page.evaluate(
                () => (window as unknown as { openedUrls: unknown[][] }).openedUrls,
            );
            expect(opened).toEqual([[address, '_blank', 'noopener']]);
            await expect(page).toHaveURL(/#stage-2$/);
        });

        test('shows no repository link on the Terraform stage', async ({ page }) => {
            await openRequest(page, '#stage-1');
            const centre = selectedStage(page);
            await centre.getByRole('button').first().click();
            await expect(centre.locator('.allocation-info a.repo-link')).toHaveCount(0);
        });
    });

    test('shows the log output of a finished stage', async ({ page }) => {
        await openRequest(page, '#stage-1');
        await expect(selectedStage(page).locator('crczp-log-view')).toBeVisible();
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

    for (const role of ROLES_WITHOUT_POOL_ACCESS) {
        test(`sends the ${role} account away from /pool/:id/sandbox-instance/:requestId`, async ({ openAs }) => {
            await expectRedirectedAway(openAs, role, requestPath(), { absentLinks: POOL_LINKS });
        });
    }
});
