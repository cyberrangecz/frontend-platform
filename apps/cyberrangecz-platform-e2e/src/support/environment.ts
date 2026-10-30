import applicationConfig from '../../../cyberrangecz-platform/public/config.json';
import type { Origin } from './state-files';

const oidcConfig = applicationConfig.authConfig.providers[0].oidcConfig;

/**
 * Origins, API roots and identity provider settings the suite talks to. API roots and OIDC
 * settings come from the configuration the application under test loads.
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
    issuer: oidcConfig.issuer,
    discoveryUrl: `${oidcConfig.issuer}/.well-known/openid-configuration`,
    clientId: oidcConfig.clientId,
    apiRoots: {
        training: applicationConfig.basePaths.linearTraining,
        sandbox: applicationConfig.basePaths.sandbox,
        userAndGroup: applicationConfig.basePaths.userAndGroup,
    },
} as const;

export type ServiceName = keyof typeof environment.apiRoots;

/** The URL the application is served from at an origin; the deployed origin must be set to ask for it. */
export function originUrl(origin: Origin): string {
    const url = origin === 'application' ? environment.applicationOrigin : environment.deployedOrigin;
    if (!url) {
        throw new Error('E2E_DEPLOYED_ORIGIN is not set');
    }
    return url;
}
