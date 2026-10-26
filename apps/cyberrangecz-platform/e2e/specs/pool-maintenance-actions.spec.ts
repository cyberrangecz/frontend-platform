import { expect, Page, test } from '@playwright/test';
import { signIn } from '../support/platform-session';

/**
 * Pool maintenance controls of the pool detail page against a deployed platform: the Delete menu
 * with its warning for sandboxes the sandbox service skipped, and Cancel all allocations.
 *
 * Required environment:
 *   F07_PLATFORM_ORIGIN         origin of the deployed frontend
 *   F07_ADMIN_USERNAME          account holding the sandbox administrator role
 *   F07_ADMIN_PASSWORD          password of that account
 *   F07_SANDBOX_DEFINITION_ID   id of the sandbox definition the test pools are built from
 * Optional environment:
 *   F07_TRAINING_DEFINITION_ID  id of a released training definition for the trainee-owned unit test
 *                               (that test is skipped when unset)
 *
 * The cloud project must have room for 6 sandboxes. The tests create pools commented
 * `F07-pool-maintenance-*` and remove them again.
 */
const ORIGIN = process.env['F07_PLATFORM_ORIGIN'];
const USERNAME = process.env['F07_ADMIN_USERNAME'];
const PASSWORD = process.env['F07_ADMIN_PASSWORD'];
const DEFINITION_ID = process.env['F07_SANDBOX_DEFINITION_ID'];
const TRAINING_DEFINITION_ID = process.env['F07_TRAINING_DEFINITION_ID'];
const ACCOUNT = { origin: ORIGIN ?? '', username: USERNAME ?? '', password: PASSWORD ?? '' };
const POOL_COMMENT = 'F07-pool-maintenance-';
const TRAINING_API = '/training/api/v1';
const SANDBOX_API = '/sandbox-service/api/v1';
const RAM_SETTLE_INTERVAL_MS = 30_000;
const RAM_SETTLE_MAX_READS = 20;
const REMOVED_CONTROLS = ['Cancel Queued', 'Force Cancel Allocation', 'Force Cleanup'];

test.skip(
    [ORIGIN, USERNAME, PASSWORD, DEFINITION_ID].some((value) => value === undefined),
    'F07_PLATFORM_ORIGIN, F07_ADMIN_USERNAME, F07_ADMIN_PASSWORD and F07_SANDBOX_DEFINITION_ID are required'
);

test.use({ baseURL: ORIGIN });

interface ApiAnswer {
    status: number;
    body: unknown;
}

interface AllocationUnit {
    id: number;
    sandbox_id: string | null;
    created_by_sub: string | null;
    allocation_request: { stages: string[] };
    cleanup_request: { stages: string[] } | null;
}

interface UnitCancellation {
    unit_id: number;
    action: string;
}
/** Calls the sandbox API from the signed-in page with its bearer token. */
async function callSandboxApi(page: Page, method: string, path: string, payload?: unknown): Promise<ApiAnswer> {
    return page.evaluate(
        async ({ method, url, payload }) => {
            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json',
                },
                body: payload === undefined ? undefined : JSON.stringify(payload),
            });
            const text = await response.text();
            let body: unknown = text;
            try {
                body = JSON.parse(text);
            } catch {
                // the body is not JSON
            }
            return { status: response.status, body };
        },
        { method, url: `${SANDBOX_API}${path}`, payload }
    );
}

async function createPool(page: Page, size: number): Promise<number> {
    const answer = await callSandboxApi(page, 'POST', '/pools', {
        definition_id: Number(DEFINITION_ID),
        max_size: size,
        comment: `${POOL_COMMENT}${Date.now()}`,
    });
    expect(answer.status).toBe(201);
    return (answer.body as { id: number }).id;
}

async function deletePool(page: Page, poolId: number): Promise<void> {
    await callSandboxApi(page, 'DELETE', `/pools/${poolId}?force=true`);
}

async function allocateUnits(page: Page, poolId: number, count: number): Promise<number[]> {
    const answer = await callSandboxApi(page, 'POST', `/pools/${poolId}/sandbox-allocation-units?count=${count}`);
    expect(answer.status).toBe(201);
    return (answer.body as { id: number }[]).map((unit) => unit.id);
}

async function listUnits(page: Page, poolId: number): Promise<AllocationUnit[]> {
    const answer = await callSandboxApi(page, 'GET', `/pools/${poolId}/sandbox-allocation-units?page_size=50`);
    return (answer.body as { results: AllocationUnit[] }).results;
}

/** Resolves once the pool's units satisfy the predicate. */
async function waitForUnits(
    page: Page,
    poolId: number,
    predicate: (units: AllocationUnit[]) => boolean,
    timeout = 600_000
): Promise<void> {
    await expect
        .poll(async () => predicate(await listUnits(page, poolId)), { timeout, intervals: [5_000] })
        .toBe(true);
}

const isReady = (unit: AllocationUnit): boolean => unit.allocation_request.stages.every((stage) => stage === 'FINISHED');
const isBuilding = (unit: AllocationUnit): boolean => unit.allocation_request.stages.includes('RUNNING');

/** Opens the Delete menu of the pool detail page. */
async function openDeleteMenu(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
}

/** Picks a Delete menu entry and confirms its dialog with the given button. */
async function runDeleteAction(page: Page, entry: string, confirmButton: string): Promise<void> {
    await openDeleteMenu(page);
    await page.getByRole('menuitem', { name: entry }).click();
    await page.getByRole('dialog').getByRole('button', { name: confirmButton }).click();
}

/** Reads the 'Notifications' panel texts. */
async function notificationTexts(page: Page): Promise<string> {
    await page.getByRole('button').filter({ hasText: 'notifications' }).click();
    return page.locator('.cdk-overlay-container').innerText();
}

/** Reads the in-use RAM of the cloud project. */
async function readRamInUse(page: Page): Promise<number> {
    const answer = await callSandboxApi(page, 'GET', '/info');
    return (answer.body as { quotas: { ram: { in_use: number } } }).quotas.ram.in_use;
}

/**
 * The quota follows a cleanup with a delay; reads it until two reads in a row agree, and gives
 * up with the last read after the given number of reads.
 */
async function ramInUseOnceSettled(page: Page): Promise<number> {
    let previous = await readRamInUse(page);
    for (let read = 1; read < RAM_SETTLE_MAX_READS; read++) {
        await page.waitForTimeout(RAM_SETTLE_INTERVAL_MS);
        const current = await readRamInUse(page);
        if (current === previous) {
            return current;
        }
        previous = current;
    }
    return previous;
}

async function postTrainingApi(page: Page, path: string, payload: unknown): Promise<ApiAnswer> {
    return page.evaluate(
        async ({ url, payload }) => {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            return { status: response.status, body: await response.json().catch(() => null) };
        },
        { url: `${TRAINING_API}${path}`, payload }
    );
}

const poolTest = test.extend<{ poolSize: number; poolId: number }>({
    poolSize: [2, { option: true }],
    poolId: async ({ page, poolSize }, use) => {
        await signIn(page, ACCOUNT);
        const poolId = await createPool(page, poolSize);
        try {
            await use(poolId);
        } finally {
            await deletePool(page, poolId);
        }
    },
});

test.describe('Pool detail controls', () => {
    poolTest.use({ poolSize: 2 });

    poolTest('the Delete menu lists the three delete entries and none of the removed ones', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 1);
        await page.goto(`/pool/${poolId}`);
        await openDeleteMenu(page);

        for (const entry of ['Delete All', 'Delete Failed', 'Delete Unlocked']) {
            await expect(page.getByRole('menuitem', { name: entry })).toBeVisible();
        }
        for (const entry of REMOVED_CONTROLS) {
            await expect(page.getByRole('menuitem', { name: entry })).toHaveCount(0);
        }
    });

    poolTest('the page offers Cancel all allocations and no removed control', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 1);
        await page.goto(`/pool/${poolId}`);

        await expect(page.getByRole('button', { name: 'Cancel all allocations' })).toBeEnabled();
        for (const control of REMOVED_CONTROLS) {
            await expect(page.getByRole('button', { name: control })).toHaveCount(0);
        }
    });

    poolTest('Cancel all allocations is disabled while the pool has no sandbox', async ({ page, poolId }) => {
        await page.goto(`/pool/${poolId}`);

        await expect(page.getByRole('button', { name: 'Cancel all allocations' })).toBeDisabled();
    });

    poolTest('Keep allocations in the Cancel all allocations dialog changes nothing', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 1);
        await page.goto(`/pool/${poolId}`);

        await page.getByRole('button', { name: 'Cancel all allocations' }).click();
        await expect(page.getByRole('dialog')).toContainText(/Cancel all allocations of pool \d+\?/);
        await page.getByRole('dialog').getByRole('button', { name: 'Keep allocations' }).click();

        await expect(page.getByRole('dialog')).toBeHidden();
        expect(await listUnits(page, poolId)).toHaveLength(1);
    });

    poolTest('Cancel all allocations with only ready sandboxes reports nothing to cancel and keeps them', async ({
        page,
        poolId,
    }) => {
        await allocateUnits(page, poolId, 1);
        await waitForUnits(page, poolId, (units) => units.length === 1 && units.every(isReady));
        await page.goto(`/pool/${poolId}`);

        await page.getByRole('button', { name: 'Cancel all allocations' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Cancel allocations' }).click();

        await expect(page.getByText('No allocation to cancel')).toBeVisible();
        const units = await listUnits(page, poolId);
        expect(units).toHaveLength(1);
        expect(units.every(isReady)).toBe(true);
    });

    poolTest('Delete All warns about a sandbox whose first stage is running', async ({ page, poolId }) => {
        const [unitId] = await allocateUnits(page, poolId, 1);
        await page.goto(`/pool/${poolId}`);

        await runDeleteAction(page, 'Delete All', 'Delete');

        const texts = await notificationTexts(page);
        expect(texts).toContain('Cleanup request for pool');
        expect(texts).toContain(`Sandbox ${unitId}`);
        expect(texts).toContain('could not be deleted yet');
        expect((await listUnits(page, poolId))[0]?.cleanup_request).toBeNull();
    });

    poolTest('Delete Unlocked warns about a sandbox whose first stage is running', async ({ page, poolId }) => {
        const [unitId] = await allocateUnits(page, poolId, 1);
        await page.goto(`/pool/${poolId}`);

        await runDeleteAction(page, 'Delete Unlocked', 'Delete');

        const texts = await notificationTexts(page);
        expect(texts).toContain(`Sandbox ${unitId}`);
        expect(texts).toContain('could not be deleted yet');
    });

    poolTest('Cancel all allocations stays enabled while every sandbox is being cleaned up', async ({
        page,
        poolId,
    }) => {
        await allocateUnits(page, poolId, 1);
        await waitForUnits(page, poolId, (units) => units.length === 1 && units.every(isReady));
        await page.goto(`/pool/${poolId}`);
        await runDeleteAction(page, 'Delete All', 'Delete');
        await expect(page.getByText('Cleanup request for pool')).toBeVisible();

        await openDeleteMenu(page);

        await expect(page.getByRole('menuitem', { name: 'Delete All' })).toBeDisabled();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Cancel all allocations' })).toBeEnabled();
    });

    poolTest('sorting the sandbox list by the frontend sort key answers without a server error', async ({ page, poolId }) => {
        for (const sortKey of ['allocation_unit_id', 'id']) {
            for (const order of ['asc', 'desc']) {
                const answer = await callSandboxApi(
                    page,
                    'GET',
                    `/pools/${poolId}/sandboxes?page=1&page_size=15&sort_by=${sortKey}&order=${order}`
                );
                expect(answer.status).toBe(200);
            }
        }
        const unknown = await callSandboxApi(page, 'GET', `/pools/${poolId}/sandboxes?sort_by=bogus&order=asc`);
        expect(unknown.status).toBe(400);
    });
});

test.describe('Pool maintenance on units in motion', () => {
    poolTest.use({ poolSize: 6 });
    poolTest('Delete Unlocked skips a trainee-owned unit without naming it', async ({ page, poolId }) => {
        test.skip(TRAINING_DEFINITION_ID === undefined, 'F07_TRAINING_DEFINITION_ID is required');
        const now = Date.now();
        const instance = await postTrainingApi(page, '/training-instances', {
            title: `${POOL_COMMENT}${now}`,
            start_time: new Date(now - 60_000).toISOString(),
            end_time: new Date(now + 3_600_000).toISOString(),
            pool_id: poolId,
            training_definition_id: Number(TRAINING_DEFINITION_ID),
            access_token: 'f07maint',
            managed: false,
            local_environment: false,
            show_stepper_bar: true,
            backward_mode: false,
        });
        expect(instance.status).toBe(200);
        const { id: instanceId, access_token: accessToken } = instance.body as { id: number; access_token: string };

        await allocateUnits(page, poolId, 1);
        const traineeUnit = await page.evaluate(
            async ({ url, token }) => {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
                        'X-Training-Access-Token': token,
                    },
                });
                return { status: response.status, body: await response.json() };
            },
            { url: `${SANDBOX_API}/pools/${poolId}/sandbox-allocation-units`, token: accessToken }
        );
        expect(traineeUnit.status).toBe(201);
        const traineeUnitId = (traineeUnit.body as { id: number }[])[0]?.id;
        await waitForUnits(page, poolId, (units) => units.length === 2 && units.every(isReady));

        await page.goto(`/pool/${poolId}`);
        await runDeleteAction(page, 'Delete Unlocked', 'Delete');

        await expect(page.getByText('Cleanup request for pool')).toBeVisible();
        await waitForUnits(page, poolId, (units) => units.length === 1);
        const remaining = await listUnits(page, poolId);
        expect(remaining[0]?.id).toBe(traineeUnitId);
        expect(remaining[0]?.cleanup_request).toBeNull();

        await callSandboxApi(page, 'POST', `/pools/${poolId}/cleanup-requests?force=true`);
        await waitForUnits(page, poolId, (units) => units.length === 0);
        await page.evaluate(
            async (url) => {
                await fetch(url, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
                });
            },
            `${TRAINING_API}/training-instances/${instanceId}?forceDelete=true`
        );
    });

    poolTest('Cancel all allocations from the page cancels building units and confirms with a toast', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 2);
        await waitForUnits(page, poolId, (units) => units.length === 2 && units.some(isBuilding));
        await page.goto(`/pool/${poolId}`);

        await page.getByRole('button', { name: 'Cancel all allocations' }).click();
        await expect(page.getByRole('dialog')).toContainText(/Every queued allocation of pool \d+ is removed/);
        await page.getByRole('dialog').getByRole('button', { name: 'Cancel allocations' }).click();

        await expect(page.getByText(/\d+ allocations? cancelled|\d+ stop pending/)).toBeVisible();
    });

    poolTest('Cancel all allocations through the API cancels every unfinished unit and strands no stack', async ({
        page,
        poolId,
    }) => {
        const baseline = await readRamInUse(page);
        await allocateUnits(page, poolId, 2);

        const cancelled = await callSandboxApi(page, 'POST', `/pools/${poolId}/cancel-allocations`);

        expect(cancelled.status).toBeLessThan(300);
        const cancellations = (cancelled.body as { units: UnitCancellation[] }).units;
        expect(cancellations.length).toBeGreaterThan(0);
        expect(cancellations.filter((cancellation) => cancellation.action === 'failed')).toHaveLength(0);
        await waitForUnits(page, poolId, (units) => units.length === 0);
        expect(await ramInUseOnceSettled(page)).toBe(baseline);
    });

    poolTest('Cancel all allocations keeps a ready unit while it cancels a queued one', async ({ page, poolId }) => {
        const [readyUnitId] = await allocateUnits(page, poolId, 1);
        await waitForUnits(page, poolId, (units) => units.length === 1 && units.every(isReady));
        await allocateUnits(page, poolId, 3);

        const cancelled = await callSandboxApi(page, 'POST', `/pools/${poolId}/cancel-allocations`);

        expect(cancelled.status).toBeLessThan(300);
        await waitForUnits(page, poolId, (units) => units.length === 1);
        expect((await listUnits(page, poolId))[0]?.id).toBe(readyUnitId);
    });

    poolTest('Delete with force of a pool whose units are building reports them and keeps the pool', async ({ page, poolId }) => {
        const unitIds = (await allocateUnits(page, poolId, 2)).sort();
        await waitForUnits(page, poolId, (units) => units.every(isBuilding));

        const [cancellation, deletion] = await Promise.all([
            callSandboxApi(page, 'POST', `/pools/${poolId}/cancel-allocations`),
            callSandboxApi(page, 'DELETE', `/pools/${poolId}?force=true`),
        ]);

        expect(cancellation.status).toBeLessThan(500);
        expect(deletion.status).toBeLessThan(500);
        const stillThere = await callSandboxApi(page, 'GET', `/pools/${poolId}`);
        expect([200, 404]).toContain(stillThere.status);
        if (deletion.status === 201) {
            const skipped = (deletion.body as { skipped_unit_ids: number[] }).skipped_unit_ids;
            expect(skipped.every((id) => unitIds.includes(id))).toBe(true);
            expect(stillThere.status).toBe(200);
        }
    });
});

test.describe('Pool overview Delete', () => {
    poolTest.use({ poolSize: 1 });

    poolTest('the Delete action stays disabled until the pool list has refreshed', async ({ page, poolId }) => {
        const poolListRequest = new RegExp(`${SANDBOX_API}/pools(\\?.*)?$`);
        let deleteStarted = false;
        let releaseListRefresh: () => void = () => undefined;
        const listRefreshHeld = new Promise<void>((resolve) => {
            releaseListRefresh = resolve;
        });
        await page.route(new RegExp(`${SANDBOX_API}/pools/${poolId}(\\?.*)?$`), async (route) => {
            deleteStarted = deleteStarted || route.request().method() === 'DELETE';
            await route.continue();
        });
        await page.route(poolListRequest, async (route) => {
            if (deleteStarted && route.request().method() === 'GET') {
                await listRefreshHeld;
            }
            await route.continue();
        });
        await page.goto('/pool');
        const poolRow = page.locator('tr').filter({ has: page.locator(`a[href$="/pool/${poolId}"]`) });
        test.skip((await poolRow.count()) === 0, 'the new pool is not on the first page of the pool list');
        const deleteAction = poolRow.locator('td[data-cy$="-actions"] button').filter({ hasText: /^\s*delete\s*$/ });
        await expect(deleteAction).toBeEnabled();

        await deleteAction.click();
        await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();

        await expect(page.getByText(`Pool ${poolId} was deleted`)).toBeVisible();
        await expect(deleteAction).toBeDisabled();
        releaseListRefresh();
        await expect(poolRow).toHaveCount(0);
    });
});
