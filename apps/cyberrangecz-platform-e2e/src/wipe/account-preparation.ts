import { ACCOUNT_KEYS, ACCOUNTS, type AccountKey } from '../support/accounts';
import type { Api } from '../support/api/api-client';
import { environment } from '../support/environment';
import { statePaths, writeState } from '../support/state-files';
import { KEPT_GROUP_NAMES } from './devel-wipe';
import type { LeftoverReport } from './leftover-report';
import { parseSeedUsers } from './seed-users';

const DEFAULT_GROUP_NAME = 'DEFAULT-GROUP';

interface Identified {
    id: number;
}

/**
 * Brings the suite's accounts to a known role state: out of every kept group but the default
 * one, each non-trainee account in a group of its own granting its role set, and their
 * passwords saved for the auth setup.
 */
export class AccountPreparation {
    constructor(
        private readonly api: Api,
        private readonly report: LeftoverReport,
    ) {}

    /**
     * Saves the seed passwords of the suite's accounts, in `ACCOUNT_KEYS` order, and of the wipe's
     * administrator account after them when one is configured, to the owner-only credentials file.
     */
    async pullCredentials(): Promise<void> {
        const seed = parseSeedUsers(await this.api.userAndGroup.sendForText('/users/initial-oidc-users'));
        const credentials: Record<string, string> = {};
        const logins = new Set(ACCOUNT_KEYS.map((account) => ACCOUNTS[account].login));
        if (environment.adminLogin !== undefined) {
            logins.add(environment.adminLogin);
        }
        for (const login of logins) {
            const password = seed.get(login);
            if (password === undefined) {
                this.report.add({ kind: 'seed account', id: login, reason: 'absent from the seed users file' });
                continue;
            }
            credentials[login] = password;
        }
        writeState(statePaths.credentials, credentials);
    }

    async resolveUserIds(): Promise<Map<AccountKey, number>> {
        const users = await this.api.userAndGroup.getAll<Identified & { sub: string }>('/users');
        const ids = new Map<AccountKey, number>();
        for (const account of ACCOUNT_KEYS) {
            const user = users.find((candidate) => candidate.sub === ACCOUNTS[account].subject);
            if (user) {
                ids.set(account, user.id);
            } else {
                this.report.add({
                    kind: 'user',
                    id: ACCOUNTS[account].subject,
                    reason: 'no user-and-group user has this subject',
                });
            }
        }
        return ids;
    }

    /** Removes the accounts from every kept group they may not stay in. */
    async removeFromKeptGroups(userIds: Map<AccountKey, number>): Promise<void> {
        const accountIds = new Set(userIds.values());
        const groups = await this.api.userAndGroup.getAll<Identified & { name: string }>('/groups');
        const purged = groups.filter(
            (group) =>
                group.name !== DEFAULT_GROUP_NAME &&
                (KEPT_GROUP_NAMES as readonly string[]).includes(group.name),
        );
        for (const group of purged) {
            await this.report.attempt({ kind: 'group membership', id: group.id, label: group.name }, async () => {
                const detail = await this.api.userAndGroup.get<{ users: Identified[] }>(`/groups/${group.id}`);
                const members = detail.users.map((user) => user.id).filter((id) => accountIds.has(id));
                if (members.length > 0) {
                    await this.api.userAndGroup.delete(`/groups/${group.id}/users`, members);
                }
            });
        }
    }

    /**
     * Creates one group per non-trainee account that owns a group, granting its role set to it and
     * to the accounts sharing it.
     */
    async createRoleGroups(userIds: Map<AccountKey, number>): Promise<void> {
        const roles = await this.api.userAndGroup.getAll<Identified & { role_type: string }>('/roles');
        const roleIds = new Map(roles.map((role) => [role.role_type, role.id]));
        for (const account of ACCOUNT_KEYS) {
            const { login, roleTypes } = ACCOUNTS[account];
            const memberIds = ACCOUNT_KEYS.filter(
                (member) => member === account || ACCOUNTS[member].sharesGroupWith === account,
            )
                .map((member) => userIds.get(member))
                .filter((id): id is number => id !== undefined);
            if (roleTypes.length === 0 || ACCOUNTS[account].sharesGroupWith || memberIds.length === 0) {
                continue;
            }
            const name = `e2e-${account}`;
            await this.report.attempt({ kind: 'role group', id: name }, async () => {
                const group = await this.api.userAndGroup.post<Identified>('/groups', {
                    name,
                    description: `Roles of the e2e account ${login}`,
                });
                for (const roleType of roleTypes) {
                    const roleId = roleIds.get(roleType);
                    if (roleId === undefined) {
                        throw new Error(`No role has the type ${roleType}`);
                    }
                    await this.api.userAndGroup.put(`/groups/${group.id}/roles/${roleId}`);
                }
                await this.api.userAndGroup.put(`/groups/${group.id}/users`, {
                    ids_of_users_to_be_add: memberIds,
                });
            });
        }
    }
}
