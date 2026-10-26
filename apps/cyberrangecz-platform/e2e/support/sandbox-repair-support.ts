import { expect, Page } from '@playwright/test';
import { PlatformAccount } from './platform-session';

const SANDBOX_API = '/sandbox-service/api/v1';
const MINUTE_MS = 60_000;

/** Returns the first environment variable of the given names that holds a value. */
export function readEnvironment(...names: string[]): string | undefined {
    for (const name of names) {
        const value = process.env[name];
        if (value !== undefined && value !== '') {
            return value;
        }
    }
    return undefined;
}

function readAccount(origin: string | undefined, usernameNames: string[], passwordNames: string[]): PlatformAccount | undefined {
    const username = readEnvironment(...usernameNames);
    const password = readEnvironment(...passwordNames);
    if (origin === undefined || username === undefined || password === undefined) {
        return undefined;
    }
    return { origin, username, password };
}

const origin = readEnvironment('F09_PLATFORM_ORIGIN', 'F07_PLATFORM_ORIGIN');

/**
 * Deployment the F-09 specs run against, read from the environment. A field is undefined when
 * its variables are not set; each spec skips itself on the fields it needs.
 */
export const sandboxRepairEnvironment = {
    origin,
    adminAccount: readAccount(
        origin,
        ['F09_ADMIN_USERNAME', 'F07_ADMIN_USERNAME'],
        ['F09_ADMIN_PASSWORD', 'F07_ADMIN_PASSWORD']
    ),
    organizerAccount: readAccount(origin, ['F09_ORGANIZER_USERNAME'], ['F09_ORGANIZER_PASSWORD']),
    sandboxDefinitionId: readEnvironment('F09_SANDBOX_DEFINITION_ID', 'F07_SANDBOX_DEFINITION_ID'),
    buildTimeoutMs: Number(readEnvironment('F09_BUILD_TIMEOUT_MS', 'F07_BUILD_TIMEOUT_MS') ?? 20 * MINUTE_MS),
};

export const ADMIN_REQUIREMENT =
    'F09_PLATFORM_ORIGIN (or F07_PLATFORM_ORIGIN), F09_ADMIN_USERNAME, F09_ADMIN_PASSWORD (or the F07_ADMIN_* pair) and F09_SANDBOX_DEFINITION_ID (or F07_SANDBOX_DEFINITION_ID) are required';
export const ORGANIZER_REQUIREMENT =
    'F09_PLATFORM_ORIGIN (or F07_PLATFORM_ORIGIN), F09_ORGANIZER_USERNAME, F09_ORGANIZER_PASSWORD and F09_SANDBOX_DEFINITION_ID (or F07_SANDBOX_DEFINITION_ID) are required';

export interface ApiAnswer {
    status: number;
    body: unknown;
}

export interface AllocationUnit {
    id: number;
    allocation_request: { id: number; stages: string[] };
    cleanup_request: { id: number; stages: string[] } | null;
}

/** Calls the sandbox API from the signed-in page with its bearer token. */
export async function callSandboxApi(page: Page, method: string, path: string, payload?: unknown): Promise<ApiAnswer> {
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

export async function createPool(page: Page, size: number, comment: string): Promise<number> {
    const answer = await callSandboxApi(page, 'POST', '/pools', {
        definition_id: Number(sandboxRepairEnvironment.sandboxDefinitionId),
        max_size: size,
        comment: `${comment}${Date.now()}`,
    });
    expect(answer.status).toBe(201);
    return (answer.body as { id: number }).id;
}

export async function deletePool(page: Page, poolId: number): Promise<void> {
    await callSandboxApi(page, 'DELETE', `/pools/${poolId}?force=true`);
}

export async function allocateUnits(page: Page, poolId: number, count: number): Promise<void> {
    const answer = await callSandboxApi(page, 'POST', `/pools/${poolId}/sandbox-allocation-units?count=${count}`);
    expect(answer.status).toBe(201);
}

export async function listUnits(page: Page, poolId: number): Promise<AllocationUnit[]> {
    const answer = await callSandboxApi(page, 'GET', `/pools/${poolId}/sandbox-allocation-units?page_size=50`);
    return (answer.body as { results: AllocationUnit[] }).results;
}

/** Resolves once the pool's units satisfy the predicate. */
export async function waitForUnits(
    page: Page,
    poolId: number,
    predicate: (units: AllocationUnit[]) => boolean,
    timeout: number = sandboxRepairEnvironment.buildTimeoutMs
): Promise<void> {
    await expect
        .poll(async () => predicate(await listUnits(page, poolId)), { timeout, intervals: [5_000] })
        .toBe(true);
}

export const isBuilding = (unit: AllocationUnit): boolean =>
    unit.cleanup_request === null && unit.allocation_request.stages.some(stage => stage === 'RUNNING');

export const isQueued = (unit: AllocationUnit): boolean =>
    unit.cleanup_request === null && unit.allocation_request.stages.every(stage => stage === 'IN_QUEUE');

export const isReady = (unit: AllocationUnit): boolean =>
    unit.cleanup_request === null && unit.allocation_request.stages.every(stage => stage === 'FINISHED');

export const hasUnfinishedAllocation = (unit: AllocationUnit): boolean =>
    unit.allocation_request.stages.some(stage => stage === 'RUNNING' || stage === 'IN_QUEUE');

/** Waits until every unit of the pool is gone, which means each cleanup ended. */
export async function waitForPoolToDrain(page: Page, poolId: number): Promise<void> {
    await waitForUnits(page, poolId, units => units.length === 0);
}
