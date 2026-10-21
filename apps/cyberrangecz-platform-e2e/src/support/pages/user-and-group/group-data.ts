import type { ApiClient } from '../../api/api-client';

/** A group as the user-and-group service answers it. */
export interface GroupRecord {
    id: number;
    name: string;
    description: string;
    can_be_deleted: boolean;
    expiration_date: string | null;
    users: { id: number; sub: string; full_name: string }[];
    roles: { id: number; role_type: string }[];
}

/** A user as the user-and-group service lists it. */
export interface UserRecord {
    id: number;
    sub: string;
    iss?: string;
    full_name: string;
    given_name: string;
    family_name: string;
    mail: string | null;
    roles?: { id: number; role_type: string; name_of_microservice: string; description: string | null }[];
}

/** Groups the platform itself maintains; they can be neither deleted nor renamed. */
export const SYSTEM_GROUP_NAMES = [
    'DEFAULT-GROUP',
    'USER-AND-GROUP_ADMINISTRATOR',
    'USER-AND-GROUP_USER',
] as const;

/** Seed users the suite may put into groups of its own; none of them is one of the 12 test accounts. */
export const MEMBER_SUBJECTS = [
    'user21@crczp',
    'user22@crczp',
    'user23@crczp',
    'user24@crczp',
    'user25@crczp',
    'user26@crczp',
    'user27@crczp',
    'user28@crczp',
    'user29@crczp',
    'user31@crczp',
    'user32@crczp',
] as const;

/** The display name the platform prints for a seed user, derived from its subject `userN@crczp`. */
export function memberDisplayName(subject: string): string {
    return `User${subject.replace(/^user(\d+)@.*$/, '$1')} Generated`;
}

/** Role types the suite grants to groups of its own; the first carries a description, the last none. */
export const GRANTABLE_ROLE_TYPES = [
    'ROLE_GUACAMOLE_TRAINEE',
    'ROLE_GUACAMOLE_ORGANISER',
    'ROLE_TRAINING_TRAINEE',
    'ROLE_SANDBOX-SERVICE_TRAINEE',
] as const;

export interface GroupSpecification {
    name: string;
    description?: string;
    /** Expiration moment, as an ISO 8601 text. */
    expirationDate?: string;
}

/** Creates a group without members or roles. */
export async function createGroup(
    api: ApiClient,
    specification: GroupSpecification,
): Promise<GroupRecord> {
    return api.post<GroupRecord>('/groups', {
        name: specification.name,
        description: specification.description ?? specification.name,
        expiration_date: specification.expirationDate,
        group_ids_of_imported_users: [],
        users: [],
    });
}

export async function readGroup(api: ApiClient, groupId: number): Promise<GroupRecord> {
    return api.get<GroupRecord>(`/groups/${groupId}`);
}

/** Every group whose name contains the text. */
export async function findGroups(api: ApiClient, nameFragment: string): Promise<GroupRecord[]> {
    return api.getAll<GroupRecord>('/groups', { name: nameFragment });
}

/** The group with exactly this name, read with its members and roles, or undefined. The list answers without them. */
export async function findGroupByName(
    api: ApiClient,
    name: string,
): Promise<GroupRecord | undefined> {
    const listed = (await findGroups(api, name)).find((group) => group.name === name);
    return listed === undefined ? undefined : readGroup(api, listed.id);
}

/** The platform's own groups, the ones the service refuses to delete. */
export async function readSystemGroups(api: ApiClient): Promise<GroupRecord[]> {
    const groups = await api.getAll<GroupRecord>('/groups');
    return groups.filter((group) => !group.can_be_deleted);
}

/** Resolves user subjects to the service's user records. */
export async function resolveUsers(
    api: ApiClient,
    subjects: readonly string[],
): Promise<UserRecord[]> {
    const users = await api.getAll<UserRecord>('/users');
    return subjects.map((subject) => {
        const user = users.find((candidate) => candidate.sub === subject);
        if (!user) {
            throw new Error(`No user with subject ${subject} exists on the backend`);
        }
        return user;
    });
}

/** The user with exactly this subject, or undefined. */
export async function findUserBySubject(
    api: ApiClient,
    subject: string,
): Promise<UserRecord | undefined> {
    return (await api.getAll<UserRecord>('/users')).find((user) => user.sub === subject);
}

export async function readUser(api: ApiClient, userId: number): Promise<UserRecord> {
    return api.get<UserRecord>(`/users/${userId}`);
}

export async function countUsers(api: ApiClient): Promise<number> {
    return (await api.getAll<UserRecord>('/users')).length;
}

/** Adds users, by subject, to a group. */
export async function addMembers(
    api: ApiClient,
    groupId: number,
    subjects: readonly string[],
): Promise<void> {
    const users = await resolveUsers(api, subjects);
    await api.put(`/groups/${groupId}/users`, {
        ids_of_users_to_be_add: users.map((user) => user.id),
        ids_of_groups_of_imported_users: [],
    });
}

/** Removes users, by subject, from a group. */
export async function removeMembers(
    api: ApiClient,
    groupId: number,
    subjects: readonly string[],
): Promise<void> {
    const users = await resolveUsers(api, subjects);
    await api.delete(`/groups/${groupId}/users`, users.map((user) => user.id));
}

/** Grants roles, by role type, to a group. */
export async function grantRoles(
    api: ApiClient,
    groupId: number,
    roleTypes: readonly string[],
): Promise<void> {
    const roles = await api.getAll<{ id: number; role_type: string }>('/roles');
    for (const roleType of roleTypes) {
        const role = roles.find((candidate) => candidate.role_type === roleType);
        if (!role) {
            throw new Error(`No role ${roleType} exists on the backend`);
        }
        await api.put(`/groups/${groupId}/roles/${role.id}`, {});
    }
}

/** Creates a group holding the given members and roles. */
export async function createPopulatedGroup(
    api: ApiClient,
    specification: GroupSpecification & {
        memberSubjects?: readonly string[];
        roleTypes?: readonly string[];
    },
): Promise<GroupRecord> {
    const group = await createGroup(api, specification);
    if (specification.memberSubjects?.length) {
        await addMembers(api, group.id, specification.memberSubjects);
    }
    if (specification.roleTypes?.length) {
        await grantRoles(api, group.id, specification.roleTypes);
    }
    return group;
}

/** An ISO 8601 moment the given number of days ahead, at noon UTC. */
export function daysAhead(days: number): string {
    const moment = new Date();
    moment.setUTCDate(moment.getUTCDate() + days);
    moment.setUTCHours(12, 0, 0, 0);
    return moment.toISOString();
}
