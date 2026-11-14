import { HttpContext, HttpErrorResponse, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CRCZPHttpService, SKIPPED_ERROR_CODES } from '@crczp/api-common';
import { PortalConfig } from '@crczp/utils';
import {
    AttachmentFileFacts,
    AttachmentList,
    AttachmentSummary,
    AttachmentTransferEvent,
    AttachmentUploadEvent,
    PendingAttachmentUpload,
} from '@crczp/training-model';
import { catchError, filter, map, Observable, of, switchMap, throwError } from 'rxjs';
import { AttachmentListDTO, AttachmentSummaryDTO } from '../../dto/training-definition/training-material-dto';
import { fileMetadataPartOf } from '../../mappers/training-definition/attachment-multipart';
import { TrainingMaterialMapper } from '../../mappers/training-definition/training-material-mapper';

const NOT_FOUND = 404;
const UNAUTHORIZED = 401;
const HIGHEST_HTTP_STATUS = 599;

/** Every failure status of a transfer the caller reports itself, so no global error dialog repeats it; unauthorized stays with the sign-in handling. */
const REPORTED_FAILURE_STATUSES = [0, ...Array.from({ length: HIGHEST_HTTP_STATUS - 399 }, (_, index) => index + 400)].filter(
    (status) => status !== UNAUTHORIZED,
);

/** A download that failed or was cut off; subscribing to the download again retries it. */
export class AttachmentTransferError extends Error {
    constructor(
        readonly hash: string,
        readonly status: number,
        options?: ErrorOptions,
    ) {
        super(`The file ${hash} could not be downloaded (HTTP ${status}).`, options);
        this.name = 'AttachmentTransferError';
    }
}

/** Reads the files stored under a training definition through the authenticated HTTP service. */
@Injectable({ providedIn: 'root' })
export class TrainingAttachmentApi {
    private readonly crczpHttp = inject(CRCZPHttpService);
    private readonly definitionsUri = `${inject(PortalConfig).basePaths.linearTraining}/training-definitions`;

    /** The materials stored under the definition with the budget and the bytes used. */
    list(definitionId: number): Observable<AttachmentList> {
        return this.crczpHttp
            .get<AttachmentListDTO>(this.attachmentsUri(definitionId),'Fetch training materials')
            .withMapper(TrainingMaterialMapper.listFromDTO)
            .execute();
    }

    /** The facts a HEAD request tells about a stored file; undefined when no file has the hash. */
    facts(definitionId: number, hash: string): Observable<AttachmentFileFacts | undefined> {
        return this.crczpHttp.raw
            .head(this.fileUri(definitionId, hash), {
                observe: 'response',
                context: new HttpContext().set(SKIPPED_ERROR_CODES, REPORTED_FAILURE_STATUSES),
            })
            .pipe(
                switchMap((response) => {
                    const { sizeBytes, ...facts } = factsOf(response);
                    return sizeBytes === undefined
                        ? this.storedSizeOf(definitionId, hash).pipe(map((storedSize) => ({ ...facts, sizeBytes: storedSize })))
                        : of({ ...facts, sizeBytes });
                }),
                catchError((error: unknown) => (isStatus(error, NOT_FOUND) ? of(undefined) : throwError(() => error))),
            );
    }

    /** The bytes of a stored file: progress events, then the finished file. */
    download(definitionId: number, hash: string): Observable<AttachmentTransferEvent> {
        return this.crczpHttp.raw
            .get(this.fileUri(definitionId, hash), {
                observe: 'events',
                reportProgress: true,
                responseType: 'blob',
                context: new HttpContext().set(SKIPPED_ERROR_CODES, REPORTED_FAILURE_STATUSES),
            })
            .pipe(
                map((event) => transferEventOf(event)),
                filter((event): event is AttachmentTransferEvent => event !== undefined),
                catchError((error: unknown) =>
                    throwError(
                        () =>
                            new AttachmentTransferError(hash, error instanceof HttpErrorResponse ? error.status : 0, {
                                cause: error,
                            }),
                    ),
                ),
            );
    }

    /**
     * Links the stored file with the hash to the definition under the file name, without sending
     * bytes; undefined when no file has the hash. Other failures error with the HTTP error response.
     */
    link(definitionId: number, hash: string, fileName: string): Observable<AttachmentSummary | undefined> {
        return this.crczpHttp.raw
            .post<AttachmentSummaryDTO>(
                `${this.attachmentsUri(definitionId)}/link`,
                { hash, file_name: fileName },
                { context: new HttpContext().set(SKIPPED_ERROR_CODES, REPORTED_FAILURE_STATUSES) },
            )
            .pipe(
                map((summary) => TrainingMaterialMapper.summaryFromDTO(summary)),
                catchError((error: unknown) => (isStatus(error, NOT_FOUND) ? of(undefined) : throwError(() => error))),
            );
    }

    /**
     * Uploads the bytes of a file with the facts captured in the browser and links it to the
     * definition: progress events, then the stored material. Errors with the HTTP error response.
     */
    upload(definitionId: number, upload: PendingAttachmentUpload): Observable<AttachmentUploadEvent> {
        return fileMetadataPartOf(upload).pipe(
            switchMap((metadata) => {
                const form = new FormData();
                form.append('file', upload.file, upload.file.name);
                form.append('metadata', metadata);
                return this.crczpHttp.raw.post<AttachmentSummaryDTO>(this.attachmentsUri(definitionId), form, {
                    observe: 'events',
                    reportProgress: true,
                    context: new HttpContext().set(SKIPPED_ERROR_CODES, REPORTED_FAILURE_STATUSES),
                });
            }),
            map((event) => uploadEventOf(event)),
            filter((event): event is AttachmentUploadEvent => event !== undefined),
        );
    }

    /** The poster image of a stored file; undefined when it has none or cannot be read. Unauthorized still errors. */
    poster(definitionId: number, hash: string): Observable<Blob | undefined> {
        return this.crczpHttp.raw
            .get(`${this.fileUri(definitionId, hash)}?poster`, {
                responseType: 'blob',
                context: new HttpContext().set(SKIPPED_ERROR_CODES, REPORTED_FAILURE_STATUSES),
            })
            .pipe(catchError((error: unknown) => (isStatus(error, UNAUTHORIZED) ? throwError(() => error) : of(undefined))));
    }

    /** The stored size of a file the HEAD response gave no length for; errors when the definition does not list it. */
    private storedSizeOf(definitionId: number, hash: string): Observable<number> {
        return this.list(definitionId).pipe(
            map(({ materials }) => materials.find((material) => material.hash === hash)?.sizeBytes),
            switchMap((sizeBytes) =>
                sizeBytes === undefined ? throwError(() => new AttachmentTransferError(hash, 0)) : of(sizeBytes),
            ),
        );
    }

    private attachmentsUri(definitionId: number): string {
        return `${this.definitionsUri}/${definitionId}/attachments`;
    }

    private fileUri(definitionId: number, hash: string): string {
        return `${this.attachmentsUri(definitionId)}/${hash}`;
    }
}

function isStatus(error: unknown, status: number): boolean {
    return error instanceof HttpErrorResponse && error.status === status;
}

function transferEventOf(event: HttpEvent<Blob>): AttachmentTransferEvent | undefined {
    if (event.type === HttpEventType.DownloadProgress) {
        return { type: 'progress', loaded: event.loaded, total: event.total ?? null };
    }
    return event instanceof HttpResponse && event.body ? { type: 'done', blob: event.body } : undefined;
}

function uploadEventOf(event: HttpEvent<AttachmentSummaryDTO>): AttachmentUploadEvent | undefined {
    if (event.type === HttpEventType.UploadProgress) {
        return { type: 'progress', loaded: event.loaded, total: event.total ?? null };
    }
    return event instanceof HttpResponse && event.body
        ? { type: 'done', summary: TrainingMaterialMapper.summaryFromDTO(event.body) }
        : undefined;
}

/** The facts a HEAD response states; the size is absent when the response has no usable Content-Length. */
function factsOf(response: HttpResponse<unknown>): Omit<AttachmentFileFacts, 'sizeBytes'> & { readonly sizeBytes?: number } {
    const header = (name: string): number | undefined => {
        const value = response.headers.get(name);
        return value === null || value === '' || Number.isNaN(Number(value)) ? undefined : Number(value);
    };
    const sizeBytes = header('Content-Length');
    const durationSeconds = header('X-Attachment-Duration');
    const width = header('X-Attachment-Width');
    const height = header('X-Attachment-Height');
    return {
        fileName: fileNameOf(response.headers.get('Content-Disposition')),
        mediaType: response.headers.get('Content-Type') ?? 'application/octet-stream',
        ...(sizeBytes !== undefined && { sizeBytes }),
        ...(durationSeconds !== undefined && { durationSeconds }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
    };
}

/** The file name of a Content-Disposition value, the UTF-8 `filename*` form first; the plain form when the encoded one is malformed. */
function fileNameOf(disposition: string | null): string {
    const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition ?? '')?.[1];
    return (encoded && decodedOrUndefined(encoded)) || (/filename\s*=\s*"?([^";]+)"?/i.exec(disposition ?? '')?.[1] ?? '');
}

function decodedOrUndefined(encoded: string): string | undefined {
    try {
        return decodeURIComponent(encoded);
    } catch {
        return undefined;
    }
}
