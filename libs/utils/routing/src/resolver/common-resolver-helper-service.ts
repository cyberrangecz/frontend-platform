import { Router } from '@angular/router';
import { ErrorHandlerService } from '@crczp/utils';
import { HttpErrorResponse } from '@angular/common/http';

export class CommonResolverHelperService {
    constructor(
        protected errorHandler: ErrorHandlerService,
        protected router: Router,
    ) {}

    /**
     * Reports a failed resolver request, naming the operation that failed.
     */
    protected emitApiError(error: HttpErrorResponse, operation: string): void {
        this.errorHandler.emitAPIError(error, operation);
    }

    /**
     * Reports a resolver failure that did not originate from an HTTP response; an HTTP failure is
     * left to the API error path.
     */
    protected emitFrontendError(error: any): void {
        if (error instanceof HttpErrorResponse) {
            return;
        }
        this.errorHandler.emitNavigationError(error);
    }
}
