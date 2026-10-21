import { type APIRequestContext, request } from '@playwright/test';

let sharedContext: Promise<APIRequestContext> | undefined;

/** The worker's one HTTP request context, which accepts the devel certificates. */
export function requestContext(): Promise<APIRequestContext> {
    sharedContext ??= request.newContext({ ignoreHTTPSErrors: true });
    return sharedContext;
}
