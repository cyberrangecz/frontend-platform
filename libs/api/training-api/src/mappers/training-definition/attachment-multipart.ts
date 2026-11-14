import { PendingAttachmentUpload } from '@crczp/training-model';
import { forkJoin, map, Observable, of } from 'rxjs';
import { AttachmentFileMetadataDTO } from '../../dto/training-definition/training-material-dto';

const JSON_TYPE = 'application/json';

/**
 * Builds the multipart body of a definition save: the definition as a JSON part, one `files`
 * part per pending file and, when any file has captured facts, a JSON `fileMetadata` part keyed
 * by file hash.
 */
export function multipartBodyOf(definition: unknown, uploads: readonly PendingAttachmentUpload[]): Observable<FormData> {
    return forkJoin(uploads.map(fileMetadataOf)).pipe(
        map((metadata) => {
            const form = new FormData();
            form.append('definition', jsonPart(definition));
            uploads.forEach(({ file }) => form.append('files', file, file.name));
            const described = metadata.filter(({ duration_seconds, width, height, poster }) =>
                [duration_seconds, width, height, poster].some((fact) => fact !== undefined),
            );
            if (described.length > 0) {
                form.append('fileMetadata', jsonPart(described));
            }
            return form;
        }),
    );
}

function jsonPart(value: unknown): Blob {
    return new Blob([JSON.stringify(value)], { type: JSON_TYPE });
}

/** The `metadata` JSON part of a single-file upload: the hash and the facts captured in the browser. */
export function fileMetadataPartOf(upload: PendingAttachmentUpload): Observable<Blob> {
    return fileMetadataOf(upload).pipe(map(jsonPart));
}

function fileMetadataOf(upload: PendingAttachmentUpload): Observable<AttachmentFileMetadataDTO> {
    const facts = {
        hash: upload.hash,
        ...(upload.durationSeconds !== undefined && { duration_seconds: upload.durationSeconds }),
        ...(upload.width !== undefined && { width: upload.width }),
        ...(upload.height !== undefined && { height: upload.height }),
    };
    return upload.poster ? base64Of(upload.poster).pipe(map((poster) => ({ ...facts, poster }))) : of(facts);
}

function base64Of(blob: Blob): Observable<string> {
    return new Observable<string>((subscriber) => {
        const reader = new FileReader();
        reader.onload = () => {
            subscriber.next((reader.result as string).split(',', 2)[1] ?? '');
            subscriber.complete();
        };
        reader.onerror = () => subscriber.error(reader.error);
        reader.readAsDataURL(blob);
        return () => reader.abort();
    });
}
