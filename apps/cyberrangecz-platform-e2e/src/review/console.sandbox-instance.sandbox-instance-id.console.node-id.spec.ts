import { expect, test } from '../support/fixtures';
import { firstAccessibleHostName, locateChainSandbox, type ChainSandbox } from '../support/pages/pool/review-sandbox';
import { readChainRecord } from '../support/shared-fixture';

const CONNECTION_TIMEOUT_MILLISECONDS = 90_000;

test.describe('console.sandbox-instance.sandbox-instance-id.console.node-id', () => {
    let own: ChainSandbox;
    let hostName: string;

    test.beforeEach(async ({ apiAs, shared, browserKey }) => {
        const sandbox = apiAs('sandboxOrganizer').sandbox;
        own = await locateChainSandbox(sandbox, shared, readChainRecord(browserKey));
        hostName = await firstAccessibleHostName(sandbox, own.sandboxUuid);
    });

    function consolePath(): string {
        return `/console/sandbox-instance/${own.sandboxUuid}/console/${encodeURIComponent(hostName)}`;
    }

    test.describe('as the sandbox organizer', () => {
        test.use({ account: 'sandboxOrganizer' });

        test('connects to the console of an accessible host', async ({ page, checkpoint }) => {
            await page.goto(consolePath());
            await expect(page.locator('crczp-console-view')).toBeVisible();
            await expect(page.locator('crczp-guacamole-status')).toContainText('Connected', {
                timeout: CONNECTION_TIMEOUT_MILLISECONDS,
            });
            await expect(page.locator('crczp-console-view canvas').first()).toBeVisible();
            await checkpoint(
                page,
                'console connected',
                `Remote console of host ${hostName} with the status Connected and the host's remote display drawn on the canvas, not blank`,
            );
        });

        test('renders the remote display of the host', async ({ page }) => {
            await page.goto(consolePath());
            await expect(page.locator('crczp-console-view canvas').first()).toBeVisible({
                timeout: CONNECTION_TIMEOUT_MILLISECONDS,
            });
        });

        test('reports no connection for a node that does not exist', async ({ page }) => {
            await page.goto(`/console/sandbox-instance/${own.sandboxUuid}/console/no-such-node`);
            await expect(page.locator('crczp-guacamole-status')).toHaveText(/Tunnel closed|Disconnected/, {
                timeout: 30_000,
            });
        });
    });

    test.describe('as a trainee', () => {
        test.use({ account: 'trainee' });

        test('keeps the page open to any signed-in account', async ({ page }) => {
            await page.goto(consolePath());
            await expect(page).toHaveURL(/\/console\//);
            await expect(page.locator('crczp-console-view')).toBeVisible();
        });
    });

    test.describe('signed out', () => {
        test.use({ account: 'anonymous' });

        test('sends a signed-out visitor away from the console', async ({ page }) => {
            await page.goto(consolePath());
            await expect(page).toHaveURL(/\/login(\?|$)/);
        });
    });
});
