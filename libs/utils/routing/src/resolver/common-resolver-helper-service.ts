import { Router } from '@angular/router';
import { ErrorHandlerService } from '@crczp/utils';
import { HttpErrorResponse } from '@angular/common/http';

export class CommonResolverHelperService {
    protected emitApiError;
    protected emitFrontendError;

    constructor(
        protected errorHandler: ErrorHandlerService,
        protected router: Router,
    ) {
        this.emitApiError = errorHandler.emitAPIError;
        this.emitFrontendError = (error: any) => {
            if (error instanceof HttpErrorResponse) {
                return;
            }
            errorHandler.emitNavigationError(error);
        };
    }
}
