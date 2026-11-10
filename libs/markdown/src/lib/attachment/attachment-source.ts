import { Observable } from 'rxjs';

/** Stored facts of an attachment, known without downloading its bytes. */
export interface AttachmentMetadata {
    readonly hash: string;
    readonly fileName: string;
    readonly mediaType: string;
    readonly size: number;
    readonly durationSeconds?: number;
    readonly width?: number;
    readonly height?: number;
}

/**
 * A file's bytes: a blob the receiver turns into an object URL it revokes itself, or an object
 * URL the source owns and the receiver never revokes.
 */
export type AttachmentContent = { readonly blob: Blob } | { readonly url: string };

/** One step of a byte download: the bytes received so far, then the finished file. */
export type AttachmentDownloadEvent =
    | { readonly type: 'progress'; readonly loaded: number; readonly total: number | null }
    | ({ readonly type: 'done' } & AttachmentContent);

/**
 * Where attachment bytes and facts come from. Callers provide a concrete source; the markdown
 * library reads attachments through it only.
 */
export abstract class AttachmentSource {
    /** The stored facts of an attachment; completes empty-handed with undefined when no file has the hash. */
    abstract metadata(hash: string): Observable<AttachmentMetadata | undefined>;

    /** Downloads the bytes, reporting progress; errors when the transfer fails. */
    abstract download(hash: string): Observable<AttachmentDownloadEvent>;

    /** The poster frame of a video or cover of an audio file; undefined when it has none. */
    abstract poster(hash: string): Observable<AttachmentContent | undefined>;

    /** Whether the hash names a local file picked but not yet stored. */
    abstract isPending(hash: string): boolean;

    /** Whether the bytes are already at hand, so a download hands them over without a transfer. */
    isDownloaded(hash: string): boolean {
        return this.isPending(hash);
    }
}
