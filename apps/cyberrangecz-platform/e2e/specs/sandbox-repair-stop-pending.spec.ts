import { expect, test } from '@playwright/test';
import { poolTest } from '../support/pool-fixture';
import {
    ADMIN_REQUIREMENT,
    allocateUnits,
    callSandboxApi,
    isBuilding,
    listUnits,
    sandboxRepairEnvironment,
    waitForPoolToDrain,
    waitForUnits,
} from '../support/sandbox-repair-support';

/**
 * Stop pending marker of the allocation request detail against a deployed platform.
 *
 * One test cancels through the sandbox API of the signed-in page (the call Cancel makes) and checks what
 * the request detail shows; another drives the Cancel build row action of the pool detail and checks its toast.
 *
 * Required environment (the F07_* name is read when the F09_* name is unset):
 *   F09_PLATFORM_ORIGIN         origin of the deployed frontend (F07_PLATFORM_ORIGIN)
 *   F09_ADMIN_USERNAME          account holding the sandbox administrator role (F07_ADMIN_USERNAME)
 *   F09_ADMIN_PASSWORD          password of that account (F07_ADMIN_PASSWORD)
 *   F09_SANDBOX_DEFINITION_ID   id of the sandbox definition the test pools are built from (F07_SANDBOX_DEFINITION_ID)
 * Optional environment:
 *   F09_BUILD_TIMEOUT_MS        longest wait for a build or a cleanup (F07_BUILD_TIMEOUT_MS)
 *
 * The cloud project must have room for 1 sandbox. The test creates a pool commented
 * `F09-stop-pending-*` and removes it again. Run the F-09 specs with one worker.
 */
const { origin, adminAccount } = sandboxRepairEnvironment;
const POOL_COMMENT = 'F09-stop-pending-';

test.skip(adminAccount === undefined, ADMIN_REQUIREMENT);
test.use({ baseURL: origin });

test.describe('Stop pending on the request detail', () => {
    poolTest.use({ poolAccount: adminAccount, poolSize: 1, poolComment: POOL_COMMENT });

    poolTest('cancelling a running allocation ends in a finished cancel or the Stop pending marker', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 1);
        await waitForUnits(page, poolId, units => units.some(isBuilding), 5 * 60_000);
        const unit = (await listUnits(page, poolId)).find(isBuilding);
        const requestId = unit?.allocation_request.id;
        if (requestId === undefined) {
            throw new Error('the building unit carries no allocation request');
        }

        const answer = await callSandboxApi(page, 'PATCH', `/allocation-requests/${requestId}/cancel`);

        expect(answer.status).toBe(200);
        const stopPending = (answer.body as { stop_pending: boolean }).stop_pending;
        expect(typeof stopPending).toBe('boolean');
        await page.goto(`/pool/${poolId}/sandbox-instance/${requestId}`);
        if (stopPending) {
            const stage = page.locator('crczp-request-stage-state').filter({ hasText: 'Stop pending' }).first();
            await expect(stage.getByRole('heading')).toBeVisible();
            await expect(stage.locator('p.stop-pending')).toHaveText(/^\s*Stop pending\s+since\s+\w{3} \d{1,2}, \d{4}/);
        } else {
            // A confirmed stop fails every stage that was still unfinished; none stays queued or running.
            const stages = page.locator('crczp-request-stage-state');
            await expect(stages).toHaveCount(3);
            await expect(stages.getByRole('heading', { name: 'Failed' }).first()).toBeVisible();
            await expect(stages.getByRole('heading', { name: /^(In Queue|Running)$/ })).toHaveCount(0);
            await expect(page.getByText(/Stop pending since/)).toHaveCount(0);
        }

        await waitForPoolToDrain(page, poolId);
    });

    poolTest('every stage of a request with a pending stop shows the Stop pending line under its state', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 1);
        const requestId = (await listUnits(page, poolId))[0]?.allocation_request.id;
        if (requestId === undefined) {
            throw new Error('the unit carries no allocation request');
        }
        const stageRoute = new RegExp(`/allocation-requests/${requestId}/stages/(networking-ansible|user-ansible|terraform)(\\?.*)?$`);
        await page.route(stageRoute, async (route) => {
            const response = await route.fetch();
            const stage = (await response.json()) as Record<string, unknown>;
            await route.fulfill({
                response,
                json: { ...stage, stop_pending: true, stop_requested_at: '2026-10-26T10:15:00Z' },
            });
        });

        await page.goto(`/pool/${poolId}/sandbox-instance/${requestId}`);

        const indicators = page.locator('crczp-request-stage-state');
        await expect(indicators).toHaveCount(3);
        for (const indicator of await indicators.all()) {
            await expect(indicator.getByRole('heading')).toBeVisible();
            await expect(indicator.locator('p.stop-pending')).toHaveText(/^\s*Stop pending\s+since\s+Oct 26, 2026/);
        }
        await page.unroute(stageRoute);
        await callSandboxApi(page, 'POST', `/pools/${poolId}/cancel-allocations`);
        await waitForPoolToDrain(page, poolId);
    });

    poolTest('the Cancel build row action confirms, cancels the request and shows its toast', async ({ page, poolId }) => {
        await allocateUnits(page, poolId, 1);
        await waitForUnits(page, poolId, units => units.some(isBuilding), 5 * 60_000);
        const requestId = (await listUnits(page, poolId)).find(isBuilding)?.allocation_request.id;
        if (requestId === undefined) {
            throw new Error('the building unit carries no allocation request');
        }
        await page.goto(`/pool/${poolId}`);

        await page.locator('td[data-cy$="-actions"] button').filter({ hasText: 'cancel' }).first().click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText(`Allocation request ${requestId} is stopped.`);
        await dialog.getByRole('button', { name: 'Cancel build' }).click();

        await expect(
            page.getByText(new RegExp(`Allocation request ${requestId}(: stop not confirmed yet| cancelled)`)),
        ).toBeVisible();
        await waitForPoolToDrain(page, poolId);
    });

    test.fixme('the marker clears once the stop is confirmed or the job is found dead', async () => {
        // Needs a build whose stop stays unconfirmed (a job that survives the Redis stop). Create it on a
        // throwaway deployment, then assert the marker disappears on the next refresh.
    });
});
