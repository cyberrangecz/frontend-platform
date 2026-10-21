import type { BrowserContext, Route } from '@playwright/test';

interface CachedAsset {
    status: number;
    headers: Record<string, string>;
    body: Buffer;
}

const STATIC_ASSET_PATH = /\.(?:js|mjs|css|woff2?|ttf|otf|svg|png|jpe?g|gif|webp|ico)$/i;

/** Headers describing how a body travelled rather than the body itself. */
const TRANSFER_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding']);

/**
 * Keeps one in-memory copy of the application's static files for every browser context of a
 * worker: each file is fetched from the server once, on the first request of any page, and served
 * from memory afterwards. Only successful responses are kept; any other request goes to the server.
 */
export class StaticAssetCache {
    private readonly assets = new Map<string, Promise<CachedAsset>>();

    /** Serves the static files the context requests from the given origin through this cache. */
    async attach(context: BrowserContext, origin: string): Promise<void> {
        const applicationOrigin = new URL(origin).origin;
        await context.route(
            (url) => url.origin === applicationOrigin && STATIC_ASSET_PATH.test(url.pathname),
            (route) => this.serve(route),
        );
    }

    private async serve(route: Route): Promise<void> {
        const url = route.request().url();
        const asset = await (this.assets.get(url) ?? this.fetchOnce(url, route)).catch(() => undefined);
        await (asset ? route.fulfill(asset) : route.continue());
    }

    private fetchOnce(url: string, route: Route): Promise<CachedAsset> {
        const asset = route.fetch().then(async (response) => {
            if (!response.ok()) {
                throw new Error(`${response.status()} ${url}`);
            }
            const headers = Object.fromEntries(
                Object.entries(response.headers()).filter(([name]) => !TRANSFER_HEADERS.has(name)),
            );
            return { status: response.status(), headers, body: await response.body() };
        });
        this.assets.set(url, asset);
        asset.catch(() => this.assets.delete(url));
        return asset;
    }
}
