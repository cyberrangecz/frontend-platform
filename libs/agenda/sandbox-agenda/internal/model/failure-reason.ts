import { HttpErrorResponse } from '@angular/common/http';

/**
 * Names why a request failed: the HTTP status when the server answered, the error message
 * when it did not.
 */
export function failureReason(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status > 0) {
        return `HTTP ${error.status}`;
    }
    const message = error instanceof Error ? error.message : '';
    return message || 'no response from the server';
}
