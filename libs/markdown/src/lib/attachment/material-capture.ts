import { catchError, finalize, from, map, Observable, of, switchMap } from 'rxjs';
import { AttachmentKind, attachmentKindOf, extensionOf } from './attachment-kind';
import { AttachmentMetadata } from './attachment-source';

/** A file picked or dropped but not stored yet, with the facts captured in the browser. */
export interface PendingMaterial {
    readonly file: File;
    readonly metadata: AttachmentMetadata;
    /** WebP of the first video frame, or a downscaled image, sharp at twice the widest card; absent for other kinds. */
    readonly poster?: Blob;
}

/** What a browser can read from a media file without a server. */
interface MediaFacts {
    readonly durationSeconds?: number;
    readonly width?: number;
    readonly height?: number;
    readonly poster?: Blob;
}

const POSTER_LONGEST_EDGE = 1920;
const POSTER_TYPE = 'image/webp';
const POSTER_QUALITY = 0.75;
const POSTER_MAXIMAL_BYTES = 1024 * 1024;

const MEDIA_TYPES_BY_EXTENSION: ReadonlyMap<string, string> = new Map(Object.entries({
    sh: 'application/x-sh',
    yaml: 'application/yaml',
    yml: 'application/yaml',
    conf: 'text/plain',
    md: 'text/markdown',
    pcap: 'application/vnd.tcpdump.pcap',
}));

/** Media type of a file, guessed from its extension when the browser gives none. */
export function mediaTypeOf(file: File): string {
    return file.type || MEDIA_TYPES_BY_EXTENSION.get(extensionOf(file.name)) || 'application/octet-stream';
}

/** The SHA-256 of a file's bytes as lowercase hex. */
export function hashOf(file: File): Observable<string> {
    return from(file.arrayBuffer()).pipe(
        switchMap((buffer) => from(crypto.subtle.digest('SHA-256', buffer))),
        map((digest) => Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')),
    );
}

/**
 * Hashes a file and reads what the browser can tell about it: the duration of audio and video,
 * the width and height of images and videos, and a poster for videos and for images, a GIF's
 * being its first frame, whose poster is smaller than the file itself. A file the
 * browser cannot decode is captured without those facts.
 */
export function captureMaterial(file: File): Observable<PendingMaterial> {
    const base = { fileName: file.name, mediaType: mediaTypeOf(file), size: file.size };
    return hashOf(file).pipe(
        switchMap((hash) =>
            factsOf(file, attachmentKindOf({ ...base, hash })).pipe(
                map(({ poster, ...facts }) => ({ file, metadata: { ...base, hash, ...facts }, ...(poster && { poster }) })),
            ),
        ),
    );
}

function factsOf(file: File, kind: AttachmentKind): Observable<MediaFacts> {
    const facts = kind === 'image' ? imageFacts(file) : kind === 'video' ? videoFacts(file) : kind === 'audio' ? audioFacts(file) : of({});
    return facts.pipe(catchError(() => of({})));
}

function imageFacts(file: File): Observable<MediaFacts> {
    return from(createImageBitmap(file)).pipe(
        switchMap((bitmap) =>
            posterOf(bitmap, bitmap.width, bitmap.height).pipe(
                map((poster) => (poster && poster.size < file.size ? poster : undefined)),
                map((poster) => ({ width: bitmap.width, height: bitmap.height, ...(poster && { poster }) })),
                finalize(() => bitmap.close()),
            ),
        ),
    );
}

/** A video without a picture track reports no dimensions and gets no poster. */
function videoFacts(file: File): Observable<MediaFacts> {
    return withMediaElement(file, 'video', 'loadeddata', (video) => {
        const durationSeconds = finiteOrUndefined(video.duration);
        if (video.videoWidth === 0 || video.videoHeight === 0) {
            return of({ durationSeconds });
        }
        return posterOf(video, video.videoWidth, video.videoHeight).pipe(
            map((poster) => ({ durationSeconds, width: video.videoWidth, height: video.videoHeight, ...(poster && { poster }) })),
        );
    });
}

function audioFacts(file: File): Observable<MediaFacts> {
    return withMediaElement(file, 'audio', 'loadedmetadata', (audio) => of({ durationSeconds: finiteOrUndefined(audio.duration) }));
}

function finiteOrUndefined(value: number): number | undefined {
    return Number.isFinite(value) ? value : undefined;
}

/** Loads a file into a detached media element, reads it once the event fires, and releases the element. */
function withMediaElement<Tag extends 'audio' | 'video', Result>(
    file: File,
    tag: Tag,
    readyEvent: 'loadedmetadata' | 'loadeddata',
    read: (element: HTMLElementTagNameMap[Tag]) => Observable<Result>,
): Observable<Result> {
    return new Observable<Result>((subscriber) => {
        const element = document.createElement(tag);
        const url = URL.createObjectURL(file);
        let reading: { unsubscribe(): void } | undefined;
        element.preload = 'auto';
        element.muted = true;
        element.addEventListener(readyEvent, () => (reading = read(element).subscribe(subscriber)), { once: true });
        element.addEventListener('error', () => subscriber.error(new Error(element.error?.message || 'The media could not be loaded.')), { once: true });
        element.src = url;
        return () => {
            reading?.unsubscribe();
            element.removeAttribute('src');
            element.load();
            URL.revokeObjectURL(url);
        };
    });
}

/** Draws a source onto a canvas no longer than the poster edge and encodes it; emits nothing usable when the encoded poster exceeds the size the server accepts. */
function posterOf(source: CanvasImageSource, width: number, height: number): Observable<Blob | undefined> {
    return new Observable<Blob | undefined>((subscriber) => {
        const scale = Math.min(1, POSTER_LONGEST_EDGE / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
            (blob) => {
                subscriber.next(blob && blob.size <= POSTER_MAXIMAL_BYTES ? blob : undefined);
                subscriber.complete();
            },
            POSTER_TYPE,
            POSTER_QUALITY,
        );
    });
}
