import { Injectable, inject } from '@angular/core';
import {UserAndGroupApiConfig} from './user-and-group-api-config';

@Injectable()
export class UserAndGroupContext {
    private readonly _config: UserAndGroupApiConfig;

    get config(): UserAndGroupApiConfig {
        return this._config;
    }

    constructor() {
        const config = inject(UserAndGroupApiConfig);

        this._config = config;
    }
}
