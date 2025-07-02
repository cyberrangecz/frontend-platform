import {HttpErrorResponse} from '@angular/common/http';

export class TopologyError {
    err: HttpErrorResponse;
    action: string;

    constructor(error: HttpErrorResponse, action: string) {
        this.err = error;
        this.action = action;
    }
}
