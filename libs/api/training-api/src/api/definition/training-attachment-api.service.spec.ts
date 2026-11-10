import { HttpContext, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CRCZPHttpService, SKIPPED_ERROR_CODES } from '@crczp/api-common';
import { PortalConfig } from '@crczp/utils';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TrainingAttachmentApi } from './training-attachment-api.service';

interface RecordedRequest {
    readonly url: string;
    readonly context: HttpContext;
}

function apiAnswering(answer: Observable<unknown>): { api: TrainingAttachmentApi; requests: RecordedRequest[] } {
    const requests: RecordedRequest[] = [];
    const record = (url: string, options: { context: HttpContext }) => {
        requests.push({ url, context: options.context });
        return answer;
    };
    TestBed.configureTestingModule({
        providers: [
            { provide: CRCZPHttpService, useValue: { raw: { get: vi.fn(record), head: vi.fn(record) } } },
            { provide: PortalConfig, useValue: { basePaths: { linearTraining: 'training' } } },
        ],
    });
    return { api: TestBed.inject(TrainingAttachmentApi), requests };
}

describe('TrainingAttachmentApi.poster', () => {
    it('delivers the poster bytes', async () => {
        const poster = new Blob(['p']);
        const { api, requests } = apiAnswering(of(poster));

        expect(await firstValueFrom(api.poster(1, 'h'))).toBe(poster);
        expect(requests[0]?.url).toBe('training/training-definitions/1/attachments/h?poster');
    });

    it.each([404, 500, 503, 0])('answers undefined and skips the global error dialog when the request fails with %i', async (status) => {
        const { api, requests } = apiAnswering(throwError(() => new HttpErrorResponse({ status })));

        expect(await firstValueFrom(api.poster(1, 'h'))).toBeUndefined();
        expect(requests[0]?.context.get(SKIPPED_ERROR_CODES)).toContain(status);
    });

    it('keeps an unauthorized answer as an error for the sign-in handling', async () => {
        const { api, requests } = apiAnswering(throwError(() => new HttpErrorResponse({ status: 401 })));

        await expect(firstValueFrom(api.poster(1, 'h'))).rejects.toBeInstanceOf(HttpErrorResponse);
        expect(requests[0]?.context.get(SKIPPED_ERROR_CODES)).not.toContain(401);
    });
});

describe('TrainingAttachmentApi.facts', () => {
    it('answers undefined and skips the global error dialog when no file has the hash', async () => {
        const { api, requests } = apiAnswering(throwError(() => new HttpErrorResponse({ status: 404 })));

        expect(await firstValueFrom(api.facts(1, 'h'))).toBeUndefined();
        expect(requests[0]?.url).toBe('training/training-definitions/1/attachments/h');
        expect(requests[0]?.context.get(SKIPPED_ERROR_CODES)).toContain(404);
    });

    it('errors to the caller and skips the global error dialog when the request is forbidden', async () => {
        const { api, requests } = apiAnswering(throwError(() => new HttpErrorResponse({ status: 403 })));

        await expect(firstValueFrom(api.facts(1, 'h'))).rejects.toBeInstanceOf(HttpErrorResponse);
        expect(requests[0]?.context.get(SKIPPED_ERROR_CODES)).toContain(403);
    });

    it('keeps an unauthorized answer as an error for the sign-in handling', async () => {
        const { api, requests } = apiAnswering(throwError(() => new HttpErrorResponse({ status: 401 })));

        await expect(firstValueFrom(api.facts(1, 'h'))).rejects.toBeInstanceOf(HttpErrorResponse);
        expect(requests[0]?.context.get(SKIPPED_ERROR_CODES)).not.toContain(401);
    });

    it('reads the file facts from the HEAD response headers', async () => {
        const headers = new HttpHeaders({
            'Content-Length': '5',
            'Content-Type': 'text/plain',
            'Content-Disposition': 'attachment; filename="notes.txt"',
        });
        const { api } = apiAnswering(of(new HttpResponse({ status: 200, headers })));

        expect(await firstValueFrom(api.facts(1, 'h'))).toEqual({
            fileName: 'notes.txt',
            mediaType: 'text/plain',
            sizeBytes: 5,
        });
    });
});
