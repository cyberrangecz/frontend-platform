import {Request} from './request';

/**
 * Class representing cleanup request
 */
export class CleanupRequest extends Request {
    constructor() {
        super('Cleanup');
    }
}
