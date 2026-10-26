import { requestContext } from './api/request-context';
import { environment } from './environment';

/** Longest total time one failed test waits for the infrastructure to answer again. */
export const INFRASTRUCTURE_WAIT_LIMIT_MILLISECONDS = 30 * 60_000;

/** Longest a single probe request may take. */
export const PROBE_TIMEOUT_MILLISECONDS = 15_000;

const FIRST_DELAY_MILLISECONDS = 5_000;
const LONGEST_DELAY_MILLISECONDS = 5 * 60_000;

const PROBED_URLS = [environment.discoveryUrl, ...Object.values(environment.apiRoots)];

/** Whether the URL answers with anything but a server error; an authentication refusal counts as answering. */
async function answers(url: string): Promise<boolean> {
    try {
        const response = await (await requestContext()).get(url, {
            failOnStatusCode: false,
            timeout: PROBE_TIMEOUT_MILLISECONDS,
        });
        return response.status() < 500;
    } catch {
        return false;
    }
}

/** Whether the identity provider or any platform API fails to answer. */
async function infrastructureIsDown(): Promise<boolean> {
    return !(await Promise.all(PROBED_URLS.map(answers))).every(Boolean);
}

/**
 * Probes the identity provider and the platform APIs and, while any of them fails to answer,
 * waits with exponentially growing pauses until all answer or the wait limit is spent.
 * Resolves to the milliseconds waited; 0 when the infrastructure answered at once.
 */
export async function waitForInfrastructure(): Promise<number> {
    if (!(await infrastructureIsDown())) {
        return 0;
    }
    const startedAt = Date.now();
    const deadline = startedAt + INFRASTRUCTURE_WAIT_LIMIT_MILLISECONDS;
    let delay = FIRST_DELAY_MILLISECONDS;
    do {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, remaining)));
        delay = Math.min(delay * 2, LONGEST_DELAY_MILLISECONDS);
    } while (await infrastructureIsDown());
    return Date.now() - startedAt;
}
