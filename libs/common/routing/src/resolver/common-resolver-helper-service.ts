import { Router, UrlTree } from '@angular/router';
import { EMPTY } from 'rxjs';
import { ErrorHandlerService } from '@crczp/utils';

export class CommonResolverHelperService {
    protected emitApiError;
    protected emitFrontendError;

    constructor(
        protected errorHandler: ErrorHandlerService,
        protected router: Router
    ) {
        this.emitApiError = errorHandler.emitAPIError;
        this.emitFrontendError = errorHandler.emitFrontendErrorNotification;
    }

    protected navigate(urlTree: UrlTree) {
        console.log('Navigating to:', this.router.serializeUrl(urlTree));
        this.router
            .navigateByUrl(urlTree)
            .catch((err) => this.emitApiError(err, 'Navigating to a route'));
        return EMPTY;
    }
}
