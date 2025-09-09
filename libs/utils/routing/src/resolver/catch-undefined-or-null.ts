import { Observable } from 'rxjs';

export function catchUndefinedOrNull<T>(
    testedObject: string,
    redirect: () => Observable<never>
): (source: Observable<T | null | undefined>) => Observable<T> {
    return (source: Observable<T | null | undefined>) => {
        return new Observable<T>((subscriber) => {
            source.subscribe({
                next: (value) => {
                    if (value !== null && value !== undefined) {
                        subscriber.next(value);
                    } else {
                        console.warn(
                            `Object ${testedObject} is undefined or null`
                        );
                        redirect().subscribe({
                            error: (err) => subscriber.error(err),
                        });
                    }
                },
                error: (err) => subscriber.error(err),
                complete: () => subscriber.complete(),
            });
        });
    };
}
