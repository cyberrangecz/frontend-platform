import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken, HttpHeaders, HttpParams } from '@angular/common/http';

import { CacheTTL, parseDurationToMs, PortalConfig } from '@crczp/utils';

import type { OffsetPagination } from '@crczp/utils';

import {
    DjangoOffsetPaginationDTO,
    DjangoResourceDTO,
    JavaOffsetPaginationDTO,
    JavaPaginatedResource
} from './pagination/pagination-types';

import { PaginationMapper } from './pagination/pagination-mapper';
import { map, Observable, of, switchMap, take, tap } from 'rxjs';
import { handleJsonError } from './validation/json-error-converter';
import { OffsetPaginatedResource } from './pagination/offset-paginated-resource';
import { HttpCacheManager, withCache } from '@ngneat/cashew';

type Backend = 'java' | 'python';
type BodylessVerb = 'GET' | 'DELETE';
type BodyVerb = 'POST' | 'PUT' | 'PATCH';

export const SKIPPED_ERROR_CODES = new HttpContextToken<number[]>(() => []);

type SplitCacheConfig<TEl, TId extends string | number> = {
    ids: TId[];
    paramName: string;
    cacheKey: (id: TId) => string;
    ttlMs: number;
    itemId: (dto: TEl) => TId;
};

type BaseOptions = {
    headers?: HttpHeaders;
    params?:
        | HttpParams
        | {
              [param: string]:
                  | string
                  | number
                  | boolean
                  | readonly (string | number | boolean)[];
          };
    reportProgress?: boolean;
    withCredentials?: boolean;
    responseType?: 'json' | 'text' | 'blob';
    observe?: 'body';
    context?: HttpContext;
};

/**
 * Typed, fluent HTTP client with mapping hooks, pagination helpers, and unified error handling.
 * Requires an explicit `operation` name for logging/telemetry on every request.
 */
@Injectable({ providedIn: 'root' })
export class CRCZPHttpService {
    private readonly http = inject(HttpClient);
    /** Unwrapped Angular HttpClient for edge cases. */
    public readonly raw = this.http;
    private readonly version = inject(PortalConfig).version;
    private readonly cacheManager = inject(HttpCacheManager);

    /**
     * Start a GET request (no request body).
     * @param url Absolute or relative URL.
     * @param operation Human-friendly operation name used in error handling/logs.
     */
    get<TRecv = unknown>(url: string, operation: string) {
        return new BodylessRequestBuilder<TRecv>(
            this.http,
            'GET',
            url,
            operation,
            this.version,
            this.cacheManager,
        );
    }

    /**
     * Start a DELETE request (no request body exposed).
     * @param url Absolute or relative URL.
     * @param operation Human-friendly operation name used in error handling/logs.
     */
    delete<TRecv = unknown>(url: string, operation: string) {
        return new BodylessRequestBuilder<TRecv>(
            this.http,
            'DELETE',
            url,
            operation,
            this.version,
            this.cacheManager,
        );
    }

    /**
     * Start a POST request (supports body and send/receive mappers).
     * @param url Absolute or relative URL.
     * @param operation Human-friendly operation name used in error handling/logs.
     */
    post<TSend = unknown, TRecv = unknown>(url: string, operation: string) {
        return new BodyRequestBuilder<TSend, TRecv>(
            this.http,
            'POST',
            url,
            operation,
        );
    }

    /**
     * Start a PUT request (supports body and send/receive mappers).
     * @param url Absolute or relative URL.
     * @param operation Human-friendly operation name used in error handling/logs.
     */
    put<TSend = unknown, TRecv = unknown>(url: string, operation: string) {
        return new BodyRequestBuilder<TSend, TRecv>(
            this.http,
            'PUT',
            url,
            operation,
        );
    }

    /**
     * Start a PATCH request (supports body and send/receive mappers).
     * @param url Absolute or relative URL.
     * @param operation Human-friendly operation name used in error handling/logs.
     */
    patch<TSend = unknown, TRecv = unknown>(url: string, operation: string) {
        return new BodyRequestBuilder<TSend, TRecv>(
            this.http,
            'PATCH',
            url,
            operation,
        );
    }
}

/**
 * Base class for shared builder features (options, receive mapping, pagination).
 */
abstract class BaseRequestBuilder<TRecv, TOut = TRecv> {
    protected options: BaseOptions = { observe: 'body', responseType: 'json' };
    protected pagination?: Backend;
    protected receiveMapper?: (from: TRecv) => TOut;
    protected expectedErrors: number[] = [];

    protected constructor(
        protected readonly http: HttpClient,
        protected readonly method: BodylessVerb | BodyVerb,
        protected readonly url: string,
        protected readonly opName: string,
    ) {}

    /**
     * Apply raw HttpClient options.
     * @param opts Subset of Angular request options.
     */
    withOptions(opts?: BaseOptions) {
        if (opts) this.options = { ...this.options, ...opts };
        return this;
    }

    /**
     * Set request headers.
     * @param headers `HttpHeaders` or a plain object map.
     */
    withHeaders(headers: HttpHeaders | Record<string, string | string[]>) {
        const h =
            headers instanceof HttpHeaders ? headers : new HttpHeaders(headers);
        this.options = { ...this.options, headers: h };
        return this;
    }

    /**
     * Specify expected error HTTP status codes that should not trigger automatic
     * error notification emission.
     *
     * @param expectedErrors Array of HTTP status codes.
     */
    setExpectedErrors(expectedErrors: number[]) {
        this.options = {
            ...this.options,
            context: (this.options.context ?? new HttpContext()).set(
                SKIPPED_ERROR_CODES,
                expectedErrors,
            ),
        };
        this.expectedErrors = expectedErrors;
        return this;
    }

    /**
     * Set query parameters.
     * @param params `HttpParams` or a plain object; values are coerced to strings.
     */
    withParams(params: HttpParams | Record<string, any>) {
        const p =
            params instanceof HttpParams
                ? params
                : new HttpParams({ fromObject: coerceParams(params) });
        this.options = { ...this.options, params: p };
        return this;
    }

    /**
     * Toggle credentialed requests (cookies).
     * @param flag Defaults to `true`.
     */
    withCredentials(flag = true) {
        this.options = { ...this.options, withCredentials: flag };
        return this;
    }

    /**
     * Toggle progress reporting (for XHR).
     * @param flag Defaults to `true`.
     */
    withProgress(flag = true) {
        this.options = { ...this.options, reportProgress: flag };
        return this;
    }

    /**
     * Expect a text response.
     */
    asText() {
        this.options = { ...this.options, responseType: 'text' };
        return this as unknown as BaseRequestBuilder<string, string>;
    }

    /**
     * Expect a Blob response.
     */
    asBlob() {
        this.options = { ...this.options, responseType: 'blob' };
        return this as unknown as BaseRequestBuilder<Blob, Blob>;
    }

    /**
     * Map the response value into a desired output type.
     * Alias: `withReceiveMapper`.
     * @param receive Mapper from `TRecv` to `R2`.
     */
    withMapper<R2>(receive: (from: TRecv) => R2) {
        this.receiveMapper = receive as unknown as (from: TRecv) => TOut;
        return this as unknown as BaseRequestBuilder<TRecv, R2>;
    }

    /**
     * Map the response value into a desired output type.
     * @param receive Mapper from `TRecv` to `R2`.
     */
    withReceiveMapper<R2>(receive: (from: TRecv) => R2) {
        return this.withMapper(receive);
    }

    /**
     * Transform a paginated backend response into `PaginatedResource<T>`.
     * When provided, item mapping uses `withMapper` for each element.
     * @param backend `'java'` or `'python'` pagination shape.
     */
    withPagination(backend: Backend) {
        this.pagination = backend;
        return this as unknown as BaseRequestBuilder<
            PaginatedEnvelope<any>,
            OffsetPaginatedResource<any>
        >;
    }

    /**
     * Execute the configured request and return an Observable of the output type.
     */
    public abstract execute(): Observable<TOut>;

    protected mapPaginatedOrReceive(piped$: Observable<any>) {
        if (this.pagination && this.options.responseType === 'json') {
            return piped$.pipe(
                map((response: any) => {
                    type DTO = unknown;

                    const rawDtos: DTO[] =
                        'content' in response
                            ? (response.content as DTO[])
                            : 'results' in response
                              ? (response.results as DTO[])
                              : [];

                    const mapItem = (this.receiveMapper ?? ((x: any) => x)) as (
                        x: DTO,
                    ) => any;
                    const elements = rawDtos.map(mapItem);

                    let pagination: OffsetPagination;
                    if (this.pagination === 'java') {
                        const p = (response as JavaPaginatedResource<DTO>)
                            .pagination as JavaOffsetPaginationDTO;
                        pagination = PaginationMapper.fromJavaDTO(p);
                    } else {
                        const p =
                            response as unknown as DjangoOffsetPaginationDTO;
                        pagination = PaginationMapper.fromDjangoDTO(p);
                    }

                    return new OffsetPaginatedResource(elements, pagination);
                }),
            );
        } else if (this.receiveMapper) {
            return piped$.pipe(map(this.receiveMapper));
        }
        return piped$;
    }
}

/**
 * Builder for methods that do not accept a request body (GET/DELETE).
 */
class BodylessRequestBuilder<TRecv, TOut = TRecv> extends BaseRequestBuilder<
    TRecv,
    TOut
> {
    private splitCacheConfig?: SplitCacheConfig<unknown, string | number>;

    constructor(
        http: HttpClient,
        method: BodylessVerb,
        url: string,
        operation: string,
        private version: string,
        private cacheManager: HttpCacheManager,
    ) {
        super(http, method, url, operation);
    }

    /**
     * Map the response value into a desired output type.
     * @param receive Mapper from `TRecv` to `R2`.
     */
    override withMapper<R2>(receive: (from: TRecv) => R2) {
        this.receiveMapper = receive as unknown as (from: TRecv) => TOut;
        return this as unknown as BodylessRequestBuilder<TRecv, R2>;
    }

    /**
     * Map the response value into a desired output type.
     * @param receive Mapper from `TRecv` to `R2`.
     */
    override withReceiveMapper<R2>(receive: (from: TRecv) => R2) {
        return this.withMapper(receive);
    }

    /**
     * Enable per-ID split caching for batch endpoints that accept an array of IDs as a query parameter.
     * Checks the cache for each ID individually, fetches only uncached IDs from the server,
     * stores each returned DTO per ID, then merges the full DTO array and feeds it through
     * the configured mapper. Mutually exclusive with {@link withCache} and {@link withPagination}.
     * @param options.ids Array of IDs to resolve.
     * @param options.paramName Query parameter name used to pass IDs to the endpoint.
     * @param options.cacheKey Function producing a unique cache key for a single ID.
     * @param options.ttlMs Cache entry lifetime in milliseconds.
     * @param options.itemId Function extracting the ID from a returned DTO element.
     */
    withSplitCacheQuery<TId extends string | number>(
        options: SplitCacheConfig<TRecv extends (infer E)[] ? E : never, TId>,
    ): this {
        this.splitCacheConfig = options as SplitCacheConfig<
            unknown,
            string | number
        >;
        return this;
    }

    /**
     * Enable caching with the specified TTL (time-to-live).
     * @param ttl Cache TTL, e.g., '30s', '5m', '2h', or 'forever'
     * @param key Optional cache key override.
     */
    withCache(ttl: CacheTTL, key: string | null = null) {
        const cacheContext = withCache({
            storage: 'localStorage',
            ttl: parseDurationToMs(ttl),
            version: this.version,
            ...(key ? { key } : {}),
        });
        const existingContext = this.options.context;
        if (existingContext) {
            const skippedErrors = existingContext.get(SKIPPED_ERROR_CODES);
            if (skippedErrors.length > 0) {
                cacheContext.set(SKIPPED_ERROR_CODES, skippedErrors);
            }
        }
        this.options = {
            ...this.options,
            context: cacheContext,
        };
        return this;
    }

    /**
     * Execute the GET/DELETE request.
     */
    execute(): Observable<TOut> {
        if (this.splitCacheConfig) {
            return this.executeSplitCache();
        }

        const opts = this.options as any;
        let request$: Observable<any>;

        switch (this.method) {
            case 'GET':
                request$ = this.http.get<TRecv>(this.url, opts);
                break;
            case 'DELETE':
                request$ = this.http.delete<TRecv>(this.url, opts);
                break;
            default:
                throw new Error(`Unsupported method ${this.method}`);
        }

        const normalized$ = request$.pipe(handleJsonError());
        const mapped$ = this.mapPaginatedOrReceive(normalized$);
        return mapped$.pipe(take(1));
    }

    private executeSplitCache(): Observable<TOut> {
        if (this.pagination) {
            throw new Error(
                'withSplitCache is mutually exclusive with withPagination',
            );
        }

        const { ids, paramName, cacheKey, ttlMs, itemId } =
            this.splitCacheConfig!;

        const cachedDtos: unknown[] = [];
        const uncachedIds: (string | number)[] = [];

        for (const id of ids) {
            const key = `${this.version}::${cacheKey(id)}`;
            if (this.cacheManager.has(key, 'localStorage')) {
                cachedDtos.push(this.cacheManager.get(key, 'localStorage'));
            } else {
                uncachedIds.push(id);
            }
        }

        const buildResult = (freshDtos: unknown[]): Observable<TOut> => {
            const merged = [...cachedDtos, ...freshDtos] as unknown as TRecv;
            return (
                this.mapPaginatedOrReceive(of(merged)) as Observable<TOut>
            ).pipe(take(1));
        };

        if (uncachedIds.length === 0) {
            return buildResult([]);
        }

        const existingParams =
            this.options.params instanceof HttpParams
                ? this.options.params
                : new HttpParams();

        const opts = {
            ...this.options,
            params: existingParams.set(paramName, uncachedIds.join(',')),
            observe: 'body' as const,
            responseType: 'json' as const,
        };

        return this.http.get<unknown[]>(this.url, opts).pipe(
            handleJsonError(),
            tap((freshDtos) => {
                for (const dto of freshDtos) {
                    this.cacheManager.set(
                        `${this.version}::${cacheKey(itemId(dto as any))}`,
                        dto,
                        { ttl: ttlMs, strategy: 'localStorage' },
                    );
                }
            }),
            switchMap((freshDtos) => buildResult(freshDtos)),
            take(1),
        );
    }
}

/**
 * Builder for methods that can carry a request body (POST/PUT/PATCH).
 */
class BodyRequestBuilder<TSend, TRecv, TOut = TRecv> extends BaseRequestBuilder<
    TRecv,
    TOut
> {
    private body?: TSend;
    private sendMapper?: (from: TSend) => unknown;

    constructor(
        http: HttpClient,
        method: BodyVerb,
        url: string,
        operation: string,
    ) {
        super(http, method, url, operation);
    }

    /**
     * Provide the request body prior to send mapping.
     * @param body Payload to send.
     */
    withBody(body: TSend) {
        this.body = body;
        return this;
    }

    /**
     * Map the outgoing body (e.g., Model -> DTO) before sending.
     * @param send Mapper from `TSend` to the wire format.
     */
    withSendMapper(send: (from: TSend) => unknown) {
        this.sendMapper = send;
        return this;
    }

    /**
     * Execute the POST/PUT/PATCH request.
     */
    execute(): Observable<TOut> {
        const opts = this.options as any;
        let request$: Observable<any>;

        switch (this.method) {
            case 'POST':
                request$ = this.http.post<TRecv>(
                    this.url,
                    this.mapSend(this.body),
                    opts,
                );
                break;
            case 'PUT':
                request$ = this.http.put<TRecv>(
                    this.url,
                    this.mapSend(this.body),
                    opts,
                );
                break;
            case 'PATCH':
                request$ = this.http.patch<TRecv>(
                    this.url,
                    this.mapSend(this.body),
                    opts,
                );
                break;
            default:
                throw new Error(`Unsupported method ${this.method}`);
        }

        const normalized$ = request$.pipe(handleJsonError());
        const mapped$ = this.mapPaginatedOrReceive(normalized$);
        return mapped$.pipe(take(1));
    }

    private mapSend(body?: TSend): unknown {
        if (body == null) return body as unknown;
        return this.sendMapper ? this.sendMapper(body) : (body as unknown);
    }
}

type PaginatedEnvelope<T> =
    | JavaPaginatedResource<T>
    | DjangoResourceDTO<T>
    | {
          content?: T[];
          results?: T[];
          pagination?: JavaOffsetPaginationDTO;
      };

function coerceParams(
    obj: Record<string, any>,
): Record<string, string | string[]> {
    const out: Record<string, string | string[]> = {};
    Object.entries(obj ?? {}).forEach(([k, v]) => {
        if (v == null) return;
        if (Array.isArray(v)) out[k] = v.map(String);
        else if (typeof v === 'object') out[k] = JSON.stringify(v);
        else out[k] = String(v);
    });
    return out;
}
