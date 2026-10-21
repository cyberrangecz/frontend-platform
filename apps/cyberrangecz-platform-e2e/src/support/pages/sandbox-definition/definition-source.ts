import type { ApiClient } from '../../api/api-client';
import type { BrowserKey } from '../../accounts';

/** A git repository and revision a sandbox definition is created from. */
export interface DefinitionSource {
    url: string;
    rev: string;
}

/** What a test creates, deletes or tries to duplicate; every purpose owns one repository and revision. */
export type DefinitionPurpose =
    | 'create'
    | 'enterSubmit'
    | 'trimmed'
    | 'duplicate'
    | 'unsaved'
    | 'cancelDelete'
    | 'delete';

interface Repository {
    name: string;
    rev: string;
}

const REPOSITORIES: Record<DefinitionPurpose, Repository> = {
    create: { name: 'library-demo-training', rev: 'no_os_type' },
    enterSubmit: { name: 'library-demo-training-adaptive', rev: 'v1.0.0' },
    trimmed: { name: 'library-secret-laboratory', rev: 'master' },
    duplicate: { name: 'library-junior-hacker-adaptive', rev: 'v1.0.0' },
    unsaved: { name: 'library-demo-training', rev: 'v1.0.0' },
    cancelDelete: { name: 'library-locust-3302', rev: 'v1.0.0' },
    delete: { name: 'library-junior-hacker', rev: 'v1.0.0' },
};

/**
 * Spellings of one repository URL. The sandbox service registers a URL and revision pair once and
 * compares the URL as written, so each browser owns one spelling and the three browsers never
 * collide. The spelling `https://github.com/cyberrangecz/<name>.git` is left out because the
 * seeded definitions use it.
 */
const URL_SPELLINGS: Record<BrowserKey, (repositoryName: string) => string> = {
    chromium: (repositoryName) => `https://github.com/cyberrangecz/${repositoryName}`,
    firefox: (repositoryName) => `https://github.com/CyberRangeCZ/${repositoryName}.git`,
    webkit: (repositoryName) => `https://github.com/CyberRangeCZ/${repositoryName}`,
};

/** The repository and revision a browser uses for a purpose. */
export function definitionSourceFor(browser: BrowserKey, purpose: DefinitionPurpose): DefinitionSource {
    const repository = REPOSITORIES[purpose];
    return { url: URL_SPELLINGS[browser](repository.name), rev: repository.rev };
}

/** A sandbox definition as the sandbox service answers it. */
export interface SandboxDefinitionRecord {
    id: number;
    name: string;
    url: string;
    rev: string;
}

/** Every sandbox definition registered from the given repository and revision. */
export async function findDefinitions(
    sandbox: ApiClient,
    source: DefinitionSource,
): Promise<SandboxDefinitionRecord[]> {
    const definitions = await sandbox.getAll<SandboxDefinitionRecord>('/definitions');
    return definitions.filter(
        (definition) => definition.url === source.url && definition.rev === source.rev,
    );
}

/** Registers a definition from the source. */
export function createDefinition(
    sandbox: ApiClient,
    source: DefinitionSource,
): Promise<SandboxDefinitionRecord> {
    return sandbox.post<SandboxDefinitionRecord>('/definitions', source);
}

/**
 * Deletes every definition registered from the source, so a retried test can register it again.
 * Fails with a message naming the source when the service refuses, for example because a pool
 * still uses the definition.
 */
export async function removeDefinitions(sandbox: ApiClient, source: DefinitionSource): Promise<void> {
    for (const definition of await findDefinitions(sandbox, source)) {
        await sandbox.delete(`/definitions/${definition.id}`).catch((cause: unknown) => {
            throw new Error(
                `Definition ${definition.id} of ${source.url} at ${source.rev} cannot be deleted before the test registers it again; a pool may still use it`,
                { cause },
            );
        });
    }
}

/** The definition registered from the source, registering it first when none exists. */
export async function ensureDefinition(
    sandbox: ApiClient,
    source: DefinitionSource,
): Promise<SandboxDefinitionRecord> {
    const [existing] = await findDefinitions(sandbox, source);
    return existing ?? createDefinition(sandbox, source);
}

/**
 * Filler definitions: repository revisions devel has registered that no purpose creates or
 * deletes. The first is the seed spelling the shared definition uses.
 */
export const FILLER_SOURCES: readonly DefinitionSource[] = [
    { url: 'https://github.com/cyberrangecz/library-demo-training.git', rev: 'master' },
    ...[
        { name: 'library-demo-training-adaptive', rev: 'master' },
        { name: 'library-junior-hacker-adaptive', rev: 'master' },
        { name: 'library-secret-laboratory', rev: 'v1.0.0' },
        { name: 'library-secret-laboratory', rev: 'v1.1.0' },
        { name: 'library-secret-laboratory', rev: 'v1.1.1' },
    ].map((repository) => ({ url: `https://github.com/cyberrangecz/${repository.name}`, rev: repository.rev })),
];

/**
 * Fails with a message naming the wipe fillers and the create specs when the sandbox service
 * holds no more than the given number of definitions.
 */
export async function ensureMoreDefinitionsThan(sandbox: ApiClient, count: number): Promise<void> {
    const registered = await sandbox.getAll<SandboxDefinitionRecord>('/definitions');
    if (registered.length <= count) {
        throw new Error(
            `The sandbox service holds ${registered.length} definitions, ${count + 1} are needed; the wipe registers the filler definitions and the create specs register one definition per purpose and browser; run the wipe, then the create specs`,
        );
    }
}
