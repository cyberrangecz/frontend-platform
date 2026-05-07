import { JSDOM } from 'jsdom';

/**
 * Patches globalThis with the minimal DOM globals required by Angular TestBed
 * when running under the Node.js Vitest environment (`// @vitest-environment node`).
 *
 * Call once at module scope in any spec file that combines `// @vitest-environment node`
 * with Angular TestBed. Guards with `??=` prevent duplicate patching when multiple spec
 * files are collected in the same worker.
 */
export function applyNodeTestEnvironment(): void {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
    (globalThis as any).window ??= dom.window;
    (globalThis as any).document ??= dom.window.document;
    (globalThis as any).location ??= dom.window.location;
    (globalThis as any).navigator ??= dom.window.navigator;
    (globalThis as any).HTMLElement ??= dom.window.HTMLElement;
    (globalThis as any).Node ??= dom.window.Node;
}
