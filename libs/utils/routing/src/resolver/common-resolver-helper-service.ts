import { Router, UrlTree } from '@angular/router';
import { EMPTY } from 'rxjs';
import { ErrorHandlerService } from '@crczp/utils';
import { HttpErrorResponse } from '@angular/common/http';

export class CommonResolverHelperService {
    protected emitApiError;
    protected emitFrontendError;

    constructor(
        protected errorHandler: ErrorHandlerService,
        protected router: Router
    ) {
        this.emitApiError = errorHandler.emitAPIError;
        this.emitFrontendError = (error: any) => {
            if (error instanceof HttpErrorResponse) {
                return;
            }
            errorHandler.emitNavigationError(error);
        };
    }

    protected navigate(urlTree: UrlTree) {
        console.log('Navigating to:', this.router.serializeUrl(urlTree));
        this.router
            .navigateByUrl(urlTree)
            .catch((err) => this.emitApiError(err, 'Navigating to a route'));
        return EMPTY;
    }
}
