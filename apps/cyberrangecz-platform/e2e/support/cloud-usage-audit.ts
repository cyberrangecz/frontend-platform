import { chromium, Page } from '@playwright/test';
import { PlatformAccount, signIn } from './platform-session';
import { ApiAnswer, callSandboxApi, sandboxRepairEnvironment } from './sandbox-repair-support';

const AUDITED_RESOURCES = ['ram', 'vcpu', 'instances'] as const;

type AuditedResource = (typeof AUDITED_RESOURCES)[number];
type ResourceAmounts = Record<AuditedResource, number>;

/** Largest difference per resource still read as unchanged, covering the rounding of the pools' usage shares. */
const TOLERANCE: ResourceAmounts = { ram: 0.5, vcpu: 0.5, instances: 0.5 };
const SETTLE_TIMEOUT_MS = 10 * 60_000;
const SETTLE_INTERVAL_MS = 30_000;
const POOL_PAGE_SIZE = 50;

interface Quota {
    limit: number;
    in_use: number;
}

interface PoolPage {
    page_count: number;
    results: { id: number; hardware_usage: Record<AuditedResource, string> | null }[];
}

/** Cloud usage the platform's sandboxes do not account for. */
interface UnaccountedUsage {
    amounts: ResourceAmounts;
    inUse: ResourceAmounts;
    unestimatedPoolIds: number[];
}

/**
 * Global setup that audits the cloud project around the run: it reads the usage the platform's
 * sandboxes do not account for, which is the project total less every pool's estimated usage, and
 * returns the global teardown that expects that usage back once the run is over. Sandboxes a run
 * keeps or removes are accounted for, so only resources no sandbox owns move it.
 * Does nothing without the sandbox administrator account of the environment.
 *
 * @returns The global teardown, which throws when the unaccounted usage does not return within
 * SETTLE_TIMEOUT_MS; nothing when the environment lacks the account.
 */
export default async function auditCloudUsage(): Promise<(() => Promise<void>) | undefined> {
    const account = sandboxRepairEnvironment.adminAccount;
    if (account === undefined) {
        return undefined;
    }
    const baseline = await withSignedInPage(account, readUnaccountedUsage);
    console.log(`Cloud usage audit, before the run: ${describeUsage(baseline)}`);
    return () => withSignedInPage(account, page => expectUsageReturnsTo(page, baseline));
}

const describeUsage = (usage: UnaccountedUsage): string =>
    AUDITED_RESOURCES.map(
        resource =>
            `${resource} ${usage.inUse[resource].toFixed(1)} in use, ${usage.amounts[resource].toFixed(1)} unaccounted`
    ).join('; ');

async function withSignedInPage<T>(account: PlatformAccount, action: (page: Page) => Promise<T>): Promise<T> {
    const browser = await chromium.launch();
    try {
        const context = await browser.newContext({ baseURL: account.origin, ignoreHTTPSErrors: true });
        const page = await context.newPage();
        await signIn(page, account);
        return await action(page);
    } finally {
        await browser.close();
    }
}

async function expectUsageReturnsTo(page: Page, baseline: UnaccountedUsage): Promise<void> {
    const deadline = Date.now() + SETTLE_TIMEOUT_MS;
    let current = await readUnaccountedUsage(page);
    while (!isUnchanged(baseline.amounts, current.amounts) && Date.now() < deadline) {
        await page.waitForTimeout(SETTLE_INTERVAL_MS);
        current = await readUnaccountedUsage(page);
    }
    if (!isUnchanged(baseline.amounts, current.amounts)) {
        throw new Error(describeChange(baseline, current));
    }
    console.log(`Cloud usage audit, after the run: ${describeUsage(current)}`);
}

const isUnchanged = (baseline: ResourceAmounts, current: ResourceAmounts): boolean =>
    AUDITED_RESOURCES.every(resource => Math.abs(current[resource] - baseline[resource]) <= TOLERANCE[resource]);

function describeChange(baseline: UnaccountedUsage, current: UnaccountedUsage): string {
    const changes = AUDITED_RESOURCES.filter(
        resource => Math.abs(current.amounts[resource] - baseline.amounts[resource]) > TOLERANCE[resource]
    ).map(resource => {
        const change = current.amounts[resource] - baseline.amounts[resource];
        return `${resource} ${change > 0 ? '+' : ''}${change.toFixed(1)} (${current.inUse[resource].toFixed(1)} in use, ${baseline.inUse[resource].toFixed(1)} before the run)`;
    });
    const unestimated = [...new Set([...baseline.unestimatedPoolIds, ...current.unestimatedPoolIds])];
    const unestimatedNote =
        unestimated.length === 0 ? '' : `; pools without a usage estimate, counted as none: ${unestimated.join(', ')}`;
    return `Cloud usage no sandbox accounts for changed during the run: ${changes.join(', ')}${unestimatedNote}`;
}

async function readUnaccountedUsage(page: Page): Promise<UnaccountedUsage> {
    const quotas = ((await readSandboxApi(page, '/info')) as { quotas: Record<AuditedResource, Quota> }).quotas;
    const accounted = mapResources(() => 0);
    const unestimatedPoolIds: number[] = [];
    let pageCount = 1;
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        const pools = (await readSandboxApi(page, `/pools?page=${pageNumber}&page_size=${POOL_PAGE_SIZE}`)) as PoolPage;
        pageCount = pools.page_count;
        for (const pool of pools.results) {
            const usage = pool.hardware_usage;
            if (usage === null) {
                unestimatedPoolIds.push(pool.id);
                continue;
            }
            for (const resource of AUDITED_RESOURCES) {
                accounted[resource] += Number(usage[resource]) * quotas[resource].limit;
            }
        }
    }
    return {
        amounts: mapResources(resource => quotas[resource].in_use - accounted[resource]),
        inUse: mapResources(resource => quotas[resource].in_use),
        unestimatedPoolIds,
    };
}

async function readSandboxApi(page: Page, path: string): Promise<unknown> {
    const answer: ApiAnswer = await callSandboxApi(page, 'GET', path);
    if (answer.status !== 200) {
        throw new Error(`Cloud usage audit could not read ${path}: HTTP ${answer.status} ${JSON.stringify(answer.body)}`);
    }
    return answer.body;
}

const mapResources = (amount: (resource: AuditedResource) => number): ResourceAmounts =>
    Object.fromEntries(AUDITED_RESOURCES.map(resource => [resource, amount(resource)])) as ResourceAmounts;
