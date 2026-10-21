import { environment, type ServiceName } from '../environment';
import { requestContext } from './request-context';
import type { RefreshTokenSource } from './token-source';

type QueryValue = string | number | boolean | readonly (string | number)[];
export type Query = Record<string, QueryValue | undefined>;

export interface RequestOptions {
    query?: Query;
    body?: unknown;
}

/** A REST call that answered with a status outside 2xx. */
export class ApiError extends Error {
    constructor(
        readonly method: string,
        readonly url: string,
        readonly status: number,
        readonly responseBody: string,
    ) {
        super(`${method} ${url} answered ${status}: ${responseBody}`);
    }
}

interface JavaPage<T> {
    content: T[];
    pagination: { number: number; total_pages: number };
}

interface DjangoPage<T> {
    results: T[];
    page: number;
    page_count: number;
}

const PAGE_SIZE = 100;

function queryString(query: Query = {}): string {
    const parameters = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) {
        if (value === undefined) {
            continue;
        }
        const values = Array.isArray(value) ? value : [value];
        for (const single of values) {
            parameters.append(name, String(single));
        }
    }
    const text = parameters.toString();
    return text ? `?${text}` : '';
}

/**
 * Sends authenticated JSON requests to one backend service under its API root.
 * Paths are relative to that root, e.g. `/pools/3`.
 */
export class ApiClient {
    constructor(
        readonly service: ServiceName,
        private readonly tokens: RefreshTokenSource,
    ) {}

    /** Sends one request and parses a JSON answer; an empty answer resolves to undefined. */
    async send<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
        const url = `${environment.apiRoots[this.service]}${path}${queryString(options.query)}`;
        const context = await requestContext();
        const response = await context.fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${await this.tokens.accessToken()}`,
                Accept: 'application/json',
            },
            data: options.body,
            failOnStatusCode: false,
        });
        const text = await response.text();
        if (!response.ok()) {
            throw new ApiError(method, url, response.status(), text);
        }
        return (text ? JSON.parse(text) : undefined) as T;
    }

    /** Sends one request and answers the raw body text, for non-JSON downloads. */
    async sendForText(path: string, query?: Query): Promise<string> {
        const url = `${environment.apiRoots[this.service]}${path}${queryString(query)}`;
        const context = await requestContext();
        const response = await context.get(url, {
            headers: { Authorization: `Bearer ${await this.tokens.accessToken()}` },
            failOnStatusCode: false,
        });
        const text = await response.text();
        if (!response.ok()) {
            throw new ApiError('GET', url, response.status(), text);
        }
        return text;
    }

    get<T>(path: string, query?: Query): Promise<T> {
        return this.send<T>('GET', path, { query });
    }

    post<T>(path: string, body?: unknown, query?: Query): Promise<T> {
        return this.send<T>('POST', path, { body, query });
    }

    put<T>(path: string, body?: unknown, query?: Query): Promise<T> {
        return this.send<T>('PUT', path, { body, query });
    }

    patch<T>(path: string, body?: unknown, query?: Query): Promise<T> {
        return this.send<T>('PATCH', path, { body, query });
    }

    delete<T>(path: string, body?: unknown, query?: Query): Promise<T> {
        return this.send<T>('DELETE', path, { body, query });
    }

    /**
     * Collects every item of a paged list. The Java services page from 0 with `size` and answer
     * `content` + `pagination`; the sandbox service pages from 1 with `page_size` and answers
     * `results` + `page` / `page_count`.
     */
    async getAll<T>(path: string, query: Query = {}): Promise<T[]> {
        return this.service === 'sandbox'
            ? this.getAllDjangoPages<T>(path, query)
            : this.getAllJavaPages<T>(path, query);
    }

    private async getAllJavaPages<T>(path: string, query: Query): Promise<T[]> {
        const items: T[] = [];
        for (let page = 0; ; page++) {
            const result = await this.get<JavaPage<T>>(path, { ...query, page, size: PAGE_SIZE });
            items.push(...result.content);
            if (page + 1 >= result.pagination.total_pages) {
                return items;
            }
        }
    }

    private async getAllDjangoPages<T>(path: string, query: Query): Promise<T[]> {
        const items: T[] = [];
        for (let page = 1; ; page++) {
            const result = await this.get<DjangoPage<T>>(path, {
                ...query,
                page,
                page_size: PAGE_SIZE,
            });
            items.push(...result.results);
            if (result.page >= result.page_count) {
                return items;
            }
        }
    }
}

/** The three service clients of one signed-in identity. */
export interface Api {
    training: ApiClient;
    sandbox: ApiClient;
    userAndGroup: ApiClient;
}

/** Builds the service clients that all authenticate through the same token source. */
export function createApi(tokens: RefreshTokenSource): Api {
    return {
        training: new ApiClient('training', tokens),
        sandbox: new ApiClient('sandbox', tokens),
        userAndGroup: new ApiClient('userAndGroup', tokens),
    };
}
