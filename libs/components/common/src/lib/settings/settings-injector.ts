import { SentinelAuthConfig } from '@sentinel/auth';

export class Settings {
    /**
     * Default page size for paginated components.
     */
    readonly DEFAULT_PAGE_SIZE: number;
    /**
     * Time to live for pagination data in days.
     */
    readonly PAGINATION_TTL: number;
    /**
     * Seconds between polling attempts for short polling intervals.
     */
    readonly POLLING_PERIOD_SHORT: number;
    /**
     * Seconds between polling attempts for long polling intervals.
     */
    readonly POLLING_PERIOD_LONG: number;
    /**
     * Maximum number of retries for api polling.
     */
    readonly RETRY_COUNT: number;
    /**
     * Enabling this option removes the deprecation of local mode in training instances.
     */
    readonly LOCAL_MODE_ALLOWED: boolean;
    /**
     * Base path for linear training api.
     */
    readonly LINEAR_TRAINING_BASE_PATH: string;
    /**
     * Base path for adaptive training api.
     */
    readonly ADAPTIVE_TRAINING_BASE_PATH: string;
    /**
     * Base path for user and group api.
     */
    readonly USER_AND_GROUP_BASE_PATH: string;
    /**
     * Base path for sandbox api.
     */
    readonly SANDBOX_BASE_PATH: string;
    /**
     * Configuration of Guacamole credentials.
     */
    readonly GUACAMOLE_CONFIG: GuacamoleConfig;
    /**
     * Configuration of OIDC providers.
     */
    readonly AUTH_CONFIG: SentinelAuthConfig;

    constructor(
        DEFAULT_PAGE_SIZE: number,
        PAGINATION_TTL: number,
        POLLING_PERIOD_SHORT: number,
        POLLING_PERIOD_LONG: number,
        RETRY_COUNT: number,
        LOCAL_MODE_ALLOWED: boolean,
        LINEAR_TRAINING_BASE_PATH: string,
        ADAPTIVE_TRAINING_BASE_PATH: string,
        USER_AND_GROUP_BASE_PATH: string,
        SANDBOX_BASE_PATH: string,
        GUACAMOLE_CONFIG: GuacamoleConfig,
        AUTH_CONFIG: SentinelAuthConfig
    ) {
        this.DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE;
        this.PAGINATION_TTL = PAGINATION_TTL;
        this.POLLING_PERIOD_SHORT = POLLING_PERIOD_SHORT;
        this.POLLING_PERIOD_LONG = POLLING_PERIOD_LONG;
        this.RETRY_COUNT = RETRY_COUNT;
        this.LOCAL_MODE_ALLOWED = LOCAL_MODE_ALLOWED;
        this.LINEAR_TRAINING_BASE_PATH = LINEAR_TRAINING_BASE_PATH;
        this.ADAPTIVE_TRAINING_BASE_PATH = ADAPTIVE_TRAINING_BASE_PATH;
        this.USER_AND_GROUP_BASE_PATH = USER_AND_GROUP_BASE_PATH;
        this.SANDBOX_BASE_PATH = SANDBOX_BASE_PATH;
        this.GUACAMOLE_CONFIG = GUACAMOLE_CONFIG;
        this.AUTH_CONFIG = AUTH_CONFIG;
    }
}

class GuacamoleConfig {
    /**
     * URL of the Apache's Guacamole
     */
    readonly GUACAMOLE_BASE_PATH: string;
    /**
     * Name of the user which is used to login to the Apache's Guacamole
     */
    readonly USERNAME: string;
    /**
     * Password for above-specified user to login to the Apache's Guacamole
     */
    readonly PASSWORD: string;

    constructor(url: string, username: string, password: string) {
        this.GUACAMOLE_BASE_PATH = url;
        this.USERNAME = username;
        this.PASSWORD = password;
    }
}
