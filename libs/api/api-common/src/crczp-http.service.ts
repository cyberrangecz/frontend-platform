import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';

import { ErrorHandlerService, PortalConfig } from '@crczp/utils';

import { OffsetPagination } from '@sentinel/common/pagination';

import {
    DjangoOffsetPaginationDTO,
    DjangoResourceDTO,
    JavaOffsetPaginationDTO,
    JavaPaginatedResource
} from './pagination/pagination-types';

import { PaginationMapper } from './pagination/pagination-mapper';
import { catchError, EMPTY, map, Observable, switchMap, take } from 'rxjs';
import { handleJsonError } from './validation/json-error-converter';
import { OffsetPaginatedResource } from './pagination/offset-paginated-resource';
import { withCache } from '@ngneat/cashew';

type Backend = 'java' | 'python';
type BodylessVerb = 'GET' | 'DELETE';
type BodyVerb = 'POST' | 'PUT' | 'PATCH';

export type CacheTTL = `${number}s` | `${number}m` | `${number}h` | 'forever';

function mapCacheTTLToMs(ttl: CacheTTL): number {
    if (ttl === 'forever') {
        return Number.MAX_SAFE_INTEGER;
    }
    if (ttl.endsWith('s')) {
        return parseInt(ttl.slice(0, -1), 10) * 1000;
    }
    if (ttl.endsWith('m')) {
        return parseInt(ttl.slice(0, -1), 10) * 60 * 1000;
    }
    if (ttl.endsWith('h')) {
        return parseInt(ttl.slice(0, -1), 10) * 60 * 60 * 1000;
    }
}
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
    private readonly errorHandler = inject(ErrorHandlerService);
    private readonly version = inject(PortalConfig).version;

    /**
     * Start a GET request (no request body).
     * @param url Absolute or relative URL.
     * @param operation Human-friendly operation name used in error handling/logs.
     */
    get<TRecv = unknown>(url: string, operation: string) {
        return new BodylessRequestBuilder<TRecv>(
            this.http,
            this.pipeError.bind(this),
            'GET',
            url,
            operation,
            this.version,
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
            this.pipeError.bind(this),
            'DELETE',
            url,
            operation,
            this.version,
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
            this.pipeError.bind(this),
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
            this.pipeError.bind(this),
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
            this.pipeError.bind(this),
            'PATCH',
            url,
            operation,
        );
    }

    private pipeError<T>(operation?: string) {
        return (src: Observable<T>) =>
            src.pipe(
                catchError((err: HttpErrorResponse) =>
                    this.errorHandler
                        .emitAPIError(err, operation)
                        .pipe(switchMap(() => EMPTY as Observable<T>)),
                ),
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

    constructor(
        protected readonly http: HttpClient,
        protected readonly errorPipe: <T>(
            operation?: string,
        ) => (src: Observable<T>) => Observable<T>,
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
    constructor(
        http: HttpClient,
        errorPipe: <T>(
            verb: string,
            operation?: string,
        ) => (src: Observable<T>) => Observable<T>,
        method: BodylessVerb,
        url: string,
        operation: string,
        private version: string,
    ) {
        super(http, errorPipe, method, url, operation);
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
     * Enable caching with the specified TTL (time-to-live).
     * @param ttl Cache TTL, e.g., '30s', '5m', '2h', or 'forever'
     * @param key Optional cache key override.
     */
    withCache(ttl: CacheTTL, key: string | null = null) {
        this.options = {
            ...this.options,
            context: withCache({
                storage: 'localStorage',
                ttl: mapCacheTTLToMs(ttl),
                version: this.version,
                ...(key ? { key } : {}),
            }),
        };
        return this;
    }

    /**
     * Execute the GET/DELETE request.
     */
    execute(): Observable<TOut> {
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
        return mapped$.pipe(take(1), this.errorPipe(this.opName));
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
        errorPipe: <T>(
            verb: string,
            operation?: string,
        ) => (src: Observable<T>) => Observable<T>,
        method: BodyVerb,
        url: string,
        operation: string,
    ) {
        super(http, errorPipe, method, url, operation);
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
        return mapped$.pipe(take(1), this.errorPipe(this.opName));
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
