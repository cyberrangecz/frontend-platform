import { Observable } from 'rxjs';

function readFile<Result extends string | ArrayBuffer>(
    file: Blob,
    start: (reader: FileReader) => void,
): Observable<Result> {
    return new Observable<Result>((subscriber) => {
        const reader = new FileReader();
        reader.onload = () => {
            subscriber.next(reader.result as Result);
            subscriber.complete();
        };
        reader.onerror = () => subscriber.error(reader.error ?? new Error('The file could not be read'));
        start(reader);
        return () => {
            if (reader.readyState === FileReader.LOADING) {
                reader.abort();
            }
        };
    });
}

/** Reads a file as text; emits once and completes. */
export function readFileAsText(file: Blob): Observable<string> {
    return readFile<string>(file, (reader) => reader.readAsText(file));
}

/** Reads a file as bytes; emits once and completes. */
export function readFileAsBytes(file: Blob): Observable<Uint8Array> {
    return new Observable<Uint8Array>((subscriber) =>
        readFile<ArrayBuffer>(file, (reader) => reader.readAsArrayBuffer(file)).subscribe({
            next: (buffer) => subscriber.next(new Uint8Array(buffer)),
            error: (error) => subscriber.error(error),
            complete: () => subscriber.complete(),
        }),
    );
}
