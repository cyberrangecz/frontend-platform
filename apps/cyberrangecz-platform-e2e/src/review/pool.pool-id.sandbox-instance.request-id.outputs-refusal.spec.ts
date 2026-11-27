import { expect, test } from '../support/fixtures';
import {
    fixedOutputs,
    mockRunningStage,
    mockStageOutputs,
    numberedLog,
    type StageKind,
} from '../support/pages/pool/log-view-page';
import { locateChainSandbox, type ChainSandbox } from '../support/pages/pool/review-sandbox';
import { readChainRecord } from '../support/shared-fixture';
import { errorDialog, waitForPageReady } from '../support/ui';

test.use({ account: 'sandboxOrganizer' });

const RUNNING_STAGE: StageKind = 'terraform';
const TERRAFORM_STAGE_FRAGMENT = 'stage-1';
const ANSWERS_BEFORE_REFUSAL = 2;
const MINIMUM_QUIET_MILLISECONDS = 5_000;
const QUIET_POLLING_PERIODS = 3;
const REFUSALS = [
    { status: 401, message: /Unauthorized access/ },
    { status: 403, message: /Insufficient permissions/ },
] as const;

test.describe('pool.pool-id.sandbox-instance.request-id stage outputs refusal', () => {
    let own: ChainSandbox;

    test.beforeEach(async ({ apiAs, shared, browserKey }) => {
        own = await locateChainSandbox(apiAs('sandboxOrganizer').sandbox, shared, readChainRecord(browserKey));
    });

    for (const { status, message } of REFUSALS) {
        test(`shows the error and stops polling the outputs of a running stage once the request answers ${status}`, async ({
            page,
        }) => {
            const log = numberedLog('Terraform', 20);
            const healthy = fixedOutputs({ terraform: log, 'networking-ansible': log, 'user-ansible': log });
            const runningStageRequestTimes: number[] = [];
            await mockRunningStage(page, RUNNING_STAGE);
            await mockStageOutputs(page, (request) => {
                if (request.kind !== RUNNING_STAGE) {
                    return healthy(request);
                }
                runningStageRequestTimes.push(Date.now());
                return request.callIndex < ANSWERS_BEFORE_REFUSAL ? healthy(request) : { status };
            });

            await page.goto(`/pool/${own.poolId}/sandbox-instance/${own.allocationRequestId}#${TERRAFORM_STAGE_FRAGMENT}`);
            await waitForPageReady(page);

            await expect(errorDialog(page).filter({ hasText: message }).first()).toBeVisible();
            const requestsAtRefusal = runningStageRequestTimes.length;
            expect(requestsAtRefusal).toBe(ANSWERS_BEFORE_REFUSAL + 1);

            const [first, second] = runningStageRequestTimes as [number, number];
            await page.waitForTimeout(Math.max(MINIMUM_QUIET_MILLISECONDS, QUIET_POLLING_PERIODS * (second - first)));
            expect(runningStageRequestTimes).toHaveLength(requestsAtRefusal);
        });
    }
});
