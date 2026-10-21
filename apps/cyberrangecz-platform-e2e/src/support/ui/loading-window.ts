import { errors, expect, type BrowserContext, type Locator, type Page, type Request } from '@playwright/test';

/** How long a wait lasts once no new request is in flight or has just completed. */
const IDLE_MILLISECONDS = 15_000;

/** Upper bound for one wait, however long the page keeps loading. */
const CAP_MILLISECONDS = 180_000;

/** Longest single attempt of the awaited condition before activity is checked again. */
const ATTEMPT_MILLISECONDS = 1_000;

/** Longest span one unfinished request keeps a wait open, so a hung or long-polling request cannot hold it. */
const REQUEST_PAUSE_MILLISECONDS = 60_000;

/** Long-lived connections that never complete and so never mark a page as loading. */
const STREAMING_RESOURCE_TYPES = new Set(['eventsource', 'websocket', 'media']);

const CAP_NOTE = 'The wait reached its overall cap while the page was still loading new requests.';

/** Identifies requests that repeat, such as polling, by method and URL without the query string. */
function requestKey(request: Request): string {
    const url = new URL(request.url());
    return `${request.method()} ${url.origin}${url.pathname}`;
}

/** Whether the request was made by a page that has since closed. */
function isFromClosedPage(request: Request): boolean {
    return request.serviceWorker() === null && request.frame().page().isClosed();
}

/** Whether a failed attempt may succeed when repeated: a timeout or an unmet assertion, not a usage error. */
function isRetriable(error: unknown): boolean {
    return error instanceof errors.TimeoutError || (error instanceof Error && 'matcherResult' in error);
}

/** Appends the cap note to the error's message and to the stack reporters print. */
function noteCapReached(error: unknown): void {
    if (!(error instanceof Error)) {
        return;
    }
    const message = error.message;
    error.message = `${message}\n${CAP_NOTE}`;
    if (error.stack) {
        error.stack = error.stack.replace(message, error.message);
    }
}

/**
 * Network activity of one browser context. Only http(s) requests count, and each only the first
 * time its key is seen, so polling never counts as loading.
 */
class LoadActivity {
    private readonly seenKeys = new Set<string>();
    private readonly newRequestsInFlight = new Map<Request, number>();
    private lastNewCompletionAt = Date.now();

    constructor(context: BrowserContext) {
        context.on('request', (request) => this.started(request));
        context.on('requestfinished', (request) => this.ended(request));
        context.on('requestfailed', (request) => this.ended(request));
    }

    /**
     * Whether a new request pauses the idle window, or the window has not run out since the later
     * of the moment, the last new completion and the end of the last expired pause. Requests of
     * closed pages are dropped.
     */
    isLoadingSince(moment: number): boolean {
        const now = Date.now();
        let lastActivityAt = Math.max(moment, this.lastNewCompletionAt);
        for (const [request, startedAt] of this.newRequestsInFlight) {
            if (isFromClosedPage(request)) {
                this.newRequestsInFlight.delete(request);
                continue;
            }
            const pauseEndsAt = startedAt + REQUEST_PAUSE_MILLISECONDS;
            if (now < pauseEndsAt) {
                return true;
            }
            lastActivityAt = Math.max(lastActivityAt, pauseEndsAt);
        }
        return now - lastActivityAt < IDLE_MILLISECONDS;
    }

    private started(request: Request): void {
        if (!/^https?:/.test(request.url()) || STREAMING_RESOURCE_TYPES.has(request.resourceType())) {
            return;
        }
        const key = requestKey(request);
        if (this.seenKeys.has(key)) {
            return;
        }
        this.seenKeys.add(key);
        this.newRequestsInFlight.set(request, Date.now());
    }

    private ended(request: Request): void {
        if (this.newRequestsInFlight.delete(request)) {
            this.lastNewCompletionAt = Date.now();
        }
    }
}

const activities = new WeakMap<BrowserContext, LoadActivity>();

function activityOf(context: BrowserContext): LoadActivity {
    let activity = activities.get(context);
    if (!activity) {
        activity = new LoadActivity(context);
        activities.set(context, activity);
    }
    return activity;
}

/** Starts recording the network activity of a context, once; call it before the first navigation. */
export function trackLoadActivity(context: BrowserContext): void {
    activityOf(context);
}

/**
 * The span one wait may take: open while the page keeps loading new requests, closed once no new
 * request has been in flight or completed for the idle window, or once the overall cap is reached.
 */
export class LoadingWindow {
    private readonly openedAt = Date.now();

    private constructor(private readonly activity: LoadActivity) {}

    static of(page: Page): LoadingWindow {
        return new LoadingWindow(activityOf(page.context()));
    }

    get capReached(): boolean {
        return Date.now() - this.openedAt >= CAP_MILLISECONDS;
    }

    get isOpen(): boolean {
        return !this.capReached && this.activity.isLoadingSince(this.openedAt);
    }

    /** The timeout for the next attempt of the awaited condition. */
    get attemptTimeout(): number {
        return Math.max(1, Math.min(ATTEMPT_MILLISECONDS, this.openedAt + CAP_MILLISECONDS - Date.now()));
    }

    /**
     * Repeats an attempt, given the timeout it may take, while it times out or its assertion fails
     * and the window is open; then rethrows the last failure, noting when the overall cap ended the
     * wait. Any other error is rethrown at once.
     */
    async retry<T>(attempt: (timeout: number) => Promise<T>): Promise<T> {
        for (;;) {
            try {
                return await attempt(this.attemptTimeout);
            } catch (error) {
                if (!isRetriable(error)) {
                    throw error;
                }
                if (this.isOpen) {
                    continue;
                }
                if (this.capReached) {
                    noteCapReached(error);
                }
                throw error;
            }
        }
    }
}

/** Waits for the locator to reach the state while the page keeps loading. */
export async function waitWhileLoading(
    locator: Locator,
    state: 'attached' | 'detached' | 'visible' | 'hidden' = 'visible',
): Promise<void> {
    await LoadingWindow.of(locator.page()).retry((timeout) => locator.waitFor({ state, timeout }));
}

/** Expects the page URL to match while the page keeps loading, as after a navigation or a guard redirect. */
export async function expectUrlWhileLoading(page: Page, url: RegExp | string): Promise<void> {
    await LoadingWindow.of(page).retry((timeout) => expect(page).toHaveURL(url, { timeout }));
}
