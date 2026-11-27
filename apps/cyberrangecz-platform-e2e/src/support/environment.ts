import type { Origin } from './state-files';

/** Reads a variable the suite cannot run without; throws naming it when it is unset or empty. */
function requiredVariable(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set`);
    }
    return value;
}

/**
 * Origins, API roots and identity provider settings the suite talks to. The API roots and the
 * identity provider settings are required variables, read on access so that tooling which only
 * loads the configuration needs none of them.
 */
export const environment = {
    applicationOrigin: process.env['E2E_APPLICATION_ORIGIN'] || 'https://localhost:4200',
    /** Origin of the deployed frontend that the specs bound to it run on; unset means those specs are dropped. */
    deployedOrigin: process.env['E2E_DEPLOYED_ORIGIN'] || undefined,
    /** Whether specs bound to the deployed origin run, which holds when that origin is set. */
    deployedOriginSpecs: Boolean(process.env['E2E_DEPLOYED_ORIGIN']),
    /** Login of the administrator account the wipe signs in with; unset means a person signs in by hand. */
    adminLogin: process.env['E2E_ADMIN_LOGIN'] || undefined,
    /** Password of that administrator account; unset means the credentials state file supplies it. */
    adminPassword: process.env['E2E_ADMIN_PASSWORD'] || undefined,
    /** Minutes between two refreshes that keep every saved account's identity provider session from going idle. */
    sessionKeepAliveMinutes: Number(process.env['E2E_SESSION_KEEP_ALIVE_MINUTES'] || 4),
    get issuer() {
        return requiredVariable('E2E_ISSUER');
    },
    get discoveryUrl() {
        return `${this.issuer}/.well-known/openid-configuration`;
    },
    get clientId() {
        return requiredVariable('E2E_CLIENT_ID');
    },
    apiRoots: {
        get training() {
            return requiredVariable('E2E_TRAINING_API_ROOT');
        },
        get sandbox() {
            return requiredVariable('E2E_SANDBOX_API_ROOT');
        },
        get userAndGroup() {
            return requiredVariable('E2E_USER_AND_GROUP_API_ROOT');
        },
    },
} as const;

/** Fails at once, naming the first required variable that is unset, so a run does not start half configured. */
export function assertRequiredEnvironment(): void {
    void [environment.issuer, environment.clientId, ...Object.values(environment.apiRoots)];
}

export type ServiceName = keyof typeof environment.apiRoots;

/** The URL the application is served from at an origin; the deployed origin must be set to ask for it. */
export function originUrl(origin: Origin): string {
    const url = origin === 'application' ? environment.applicationOrigin : environment.deployedOrigin;
    if (!url) {
        throw new Error('E2E_DEPLOYED_ORIGIN is not set');
    }
    return url;
}
