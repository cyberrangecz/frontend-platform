declare module 'jsdom' {
    export class JSDOM {
        constructor(html?: string, options?: { url?: string; [key: string]: unknown });
        readonly window: Window & typeof globalThis & { [key: string]: unknown };
    }
}
