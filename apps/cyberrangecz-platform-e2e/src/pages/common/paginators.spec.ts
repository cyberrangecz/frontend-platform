import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import type { AccountRole } from '../../support/accounts';
import { PoolOverviewPage } from '../../support/pages/pool/pool-overview-page';
import { SandboxImagePage } from '../../support/pages/pool/sandbox-image-page';
import { RunOverviewPage } from '../../support/pages/run/run-overview-page';
import { SandboxDefinitionOverviewPage } from '../../support/pages/sandbox-definition/sandbox-definition-overview.page';
import { DefinitionOverviewPage } from '../../support/pages/training-definition/definition-overview.page';
import { InstanceOverviewPage } from '../../support/pages/training-instance/instance-overview.page';
import { GroupOverviewPage } from '../../support/pages/user-and-group/group-pages';
import { UserOverviewPage } from '../../support/pages/user-and-group/user-pages';
import type { SentinelTable } from '../../support/ui';

const ALLOWED_PAGE_SIZES = [10, 15, 25, 50, 100];
const LARGEST_PAGE_SIZE = 100;

interface PaginatedPage {
    name: string;
    account: AccountRole;
    open: (page: Page) => Promise<SentinelTable>;
}

const PAGINATED_PAGES: PaginatedPage[] = [
    {
        name: 'run overview',
        account: 'trainee',
        open: async (page) => {
            const overview = new RunOverviewPage(page);
            await overview.open();
            return overview.table;
        },
    },
    {
        name: 'training definition overview',
        account: 'trainingDesigner',
        open: async (page) => {
            const overview = new DefinitionOverviewPage(page);
            await overview.goto();
            return overview.table;
        },
    },
    {
        name: 'training instance overview',
        account: 'trainingOrganizer',
        open: async (page) => {
            const overview = new InstanceOverviewPage(page);
            await overview.open();
            return overview.table;
        },
    },
    {
        name: 'sandbox definition overview',
        account: 'sandboxDesigner',
        open: async (page) => {
            const overview = new SandboxDefinitionOverviewPage(page);
            await overview.open();
            return overview.table;
        },
    },
    {
        name: 'pool overview',
        account: 'sandboxOrganizer',
        open: async (page) => {
            const overview = new PoolOverviewPage(page);
            await overview.open();
            return overview.table;
        },
    },
    {
        name: 'sandbox images',
        account: 'sandboxOrganizer',
        open: async (page) => {
            const images = new SandboxImagePage(page);
            await images.open();
            return images.table;
        },
    },
    {
        name: 'group overview',
        account: 'userAdministrator',
        open: async (page) => {
            const overview = new GroupOverviewPage(page);
            await overview.open();
            return overview.table;
        },
    },
    {
        name: 'user overview',
        account: 'userAdministrator',
        open: async (page) => {
            const overview = new UserOverviewPage(page);
            await overview.open();
            return overview.table;
        },
    },
];

test.describe('paginators', () => {
    for (const { name, account, open } of PAGINATED_PAGES) {
        test.describe(name, () => {
            test.use({ account });

            test('starts at a page size of at most 100 and lists only allowed sizes of at most 100', async ({
                page,
            }) => {
                const table = await open(page);
                const selectedSize = Number((await table.pageSizeSelect.innerText()).trim());
                expect(selectedSize).toBeLessThanOrEqual(LARGEST_PAGE_SIZE);

                await table.openPageSizeList();
                const listedSizes = (await page.getByRole('option').allInnerTexts()).map((text) => text.trim());
                expect(listedSizes.length).toBeGreaterThan(0);
                for (const listedSize of listedSizes) {
                    expect(listedSize).toMatch(/^\d+$/);
                    expect(ALLOWED_PAGE_SIZES).toContain(Number(listedSize));
                    expect(Number(listedSize)).toBeLessThanOrEqual(LARGEST_PAGE_SIZE);
                }
            });
        });
    }
});
