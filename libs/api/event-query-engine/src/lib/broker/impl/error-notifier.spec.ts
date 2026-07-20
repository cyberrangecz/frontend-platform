import { catchError, firstValueFrom, lastValueFrom, of, toArray } from 'rxjs';
import { notifyError, notifyOutage } from './error-notifier';
import { ErrorHandlerService } from '@crczp/utils';

describe('notifyError', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let errorHandler: {
        emitFrontendErrorNotification: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        errorHandler = {
            emitFrontendErrorNotification: vi.fn(() => of(true)),
        };
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('when error is an Error instance', () => {
        it('calls console.error with the error', async () => {
            const error = new Error('something went wrong');

            firstValueFrom(
                notifyError(
                    error,
                    errorHandler as unknown as ErrorHandlerService,
                ).pipe(catchError(() => of(undefined))),
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(error);
        });

        it('calls emitFrontendErrorNotification with error.message', async () => {
            const error = new Error('something went wrong');

            await firstValueFrom(
                notifyError(
                    error,
                    errorHandler as unknown as ErrorHandlerService,
                ).pipe(catchError(() => of(undefined))),
            );

            expect(
                errorHandler.emitFrontendErrorNotification,
            ).toHaveBeenCalledWith('something went wrong');
        });

        it('returns an observable that errors with the original error', async () => {
            const error = new Error('original error');
            let caughtError: unknown;

            await firstValueFrom(
                notifyError(
                    error,
                    errorHandler as unknown as ErrorHandlerService,
                ).pipe(
                    catchError((err) => {
                        caughtError = err;
                        return of(undefined);
                    }),
                ),
            );

            expect(caughtError).toBe(error);
        });
    });

    describe('when error is not an Error instance', () => {
        it('calls console.error with the non-Error value', async () => {
            const error = 'string error';

            await firstValueFrom(
                notifyError(
                    error,
                    errorHandler as unknown as ErrorHandlerService,
                ).pipe(catchError(() => of(undefined))),
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith('string error');
        });

        it('converts non-Error values to string for notification', async () => {
            const error = 'string error';

            await firstValueFrom(
                notifyError(
                    error,
                    errorHandler as unknown as ErrorHandlerService,
                ).pipe(catchError(() => of(undefined))),
            );

            expect(
                errorHandler.emitFrontendErrorNotification,
            ).toHaveBeenCalledWith('string error');
        });

        it('handles numbers as error values', async () => {
            const error = 42;

            await firstValueFrom(
                notifyError(
                    error,
                    errorHandler as unknown as ErrorHandlerService,
                ).pipe(catchError(() => of(undefined))),
            );

            expect(
                errorHandler.emitFrontendErrorNotification,
            ).toHaveBeenCalledWith('42');
        });

        it('returns an observable that errors with the original non-Error value', async () => {
            const error = 'string error';
            let caughtError: unknown;

            await firstValueFrom(
                notifyError(
                    error,
                    errorHandler as unknown as ErrorHandlerService,
                ).pipe(
                    catchError((err) => {
                        caughtError = err;
                        return of(undefined);
                    }),
                ),
            );

            expect(caughtError).toBe('string error');
        });
    });
});

describe('notifyOutage', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let errorHandler: {
        emitFrontendErrorNotification: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        errorHandler = {
            emitFrontendErrorNotification: vi.fn(() => of(true)),
        };
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('logs the error', async () => {
        const error = new Error('outage');

        await lastValueFrom(
            notifyOutage(
                error,
                errorHandler as unknown as ErrorHandlerService,
            ).pipe(toArray()),
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });

    it('notifies the error handler once with the error message', async () => {
        const error = new Error('outage');

        await lastValueFrom(
            notifyOutage(
                error,
                errorHandler as unknown as ErrorHandlerService,
            ).pipe(toArray()),
        );

        expect(errorHandler.emitFrontendErrorNotification).toHaveBeenCalledTimes(1);
        expect(errorHandler.emitFrontendErrorNotification).toHaveBeenCalledWith('outage');
    });

    it('completes without emitting any value and does not rethrow', async () => {
        const error = new Error('outage');

        const emitted = await lastValueFrom(
            notifyOutage(
                error,
                errorHandler as unknown as ErrorHandlerService,
            ).pipe(toArray()),
        );

        expect(emitted).toEqual([]);
    });

    it('stringifies non-Error values for the notification', async () => {
        await lastValueFrom(
            notifyOutage(
                'string outage',
                errorHandler as unknown as ErrorHandlerService,
            ).pipe(toArray()),
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith('string outage');
        expect(errorHandler.emitFrontendErrorNotification).toHaveBeenCalledWith('string outage');
    });
});
