import { ACCOUNTS } from '../../accounts';
import type { Api } from '../../api/api-client';
import { displayNameOf } from '../common/role-agendas';
import { sharedTrainingImport } from '../../scenario/shared-training-loader';

export type DefinitionState = 'UNRELEASED' | 'RELEASED' | 'ARCHIVED';

export interface DefinitionLevelDto {
    id: number;
    title: string;
    order: number;
    level_type: 'INFO_LEVEL' | 'ACCESS_LEVEL' | 'TRAINING_LEVEL' | 'ASSESSMENT_LEVEL';
    [field: string]: unknown;
}

export interface DefinitionDto {
    id: number;
    title: string;
    description: string | null;
    prerequisites: string[];
    outcomes: string[];
    state: DefinitionState;
    levels?: DefinitionLevelDto[];
}

interface AuthorDto {
    user_ref_id: number;
    sub: string;
    full_name: string;
}

interface Page<T> {
    content: T[];
}

/** The suite's second training designer account, a member of the first designer's group. */
export const SECOND_DESIGNER = {
    search: displayNameOf(ACCOUNTS.secondTrainingDesigner.login),
    login: ACCOUNTS.secondTrainingDesigner.subject,
} as const;

/** Creates a definition without levels through the REST API. */
export function createEmptyDefinition(
    api: Api,
    title: string,
    fields: Partial<Pick<DefinitionDto, 'description' | 'prerequisites' | 'outcomes'>> = {},
): Promise<DefinitionDto> {
    return api.training.post<DefinitionDto>('/training-definitions', {
        title,
        description: fields.description ?? null,
        prerequisites: fields.prerequisites ?? [],
        outcomes: fields.outcomes ?? [],
        state: 'UNRELEASED',
        levels: [],
    });
}

/** Imports a definition holding one level of every type, two hints and the three question types. */
export function importFullDefinition(api: Api, title: string): Promise<DefinitionDto> {
    return importDefinitionBody(api, sharedTrainingImport(title));
}

/** Imports a definition from an import body. */
export function importDefinitionBody(api: Api, body: unknown): Promise<DefinitionDto> {
    return api.training.post<DefinitionDto>('/imports/training-definitions', body);
}

export function fetchDefinition(api: Api, definitionId: number): Promise<DefinitionDto> {
    return api.training.get<DefinitionDto>(`/training-definitions/${definitionId}`);
}

/** Exports a definition in the import format. */
export function exportDefinition(api: Api, definitionId: number): Promise<Record<string, unknown>> {
    return api.training.get<Record<string, unknown>>(`/exports/training-definitions/${definitionId}`);
}

export async function fetchDefinitionByTitle(api: Api, title: string): Promise<DefinitionDto | undefined> {
    const page = await api.training.get<Page<DefinitionDto>>('/training-definitions', {
        title,
        page: 0,
        size: 50,
    });
    return page.content.find((definition) => definition.title === title);
}

/** The definition with this exact title; throws when the backend holds none. */
export async function requireDefinitionByTitle(api: Api, title: string): Promise<DefinitionDto> {
    const definition = await fetchDefinitionByTitle(api, title);
    if (!definition) {
        throw new Error(`No training definition is titled "${title}"`);
    }
    return definition;
}

/** The full detail, levels included, of the definition with this exact title. */
export async function fetchDefinitionDetailByTitle(api: Api, title: string): Promise<DefinitionDto> {
    return fetchDefinition(api, (await requireDefinitionByTitle(api, title)).id);
}

export function changeDefinitionState(
    api: Api,
    definitionId: number,
    state: DefinitionState,
): Promise<void> {
    return api.training.put<void>(`/training-definitions/${definitionId}/states/${state}`, {});
}

export async function fetchAuthorLogins(api: Api, definitionId: number): Promise<string[]> {
    const page = await api.training.get<Page<AuthorDto>>(
        `/training-definitions/${definitionId}/authors`,
        { page: 0, size: 100 },
    );
    return page.content.map((author) => author.sub);
}

/** Import-format body of a definition whose one training level carries the given MITRE technique. */
export function definitionWithTechnique(title: string, techniqueKey: string): unknown {
    const body = sharedTrainingImport(title);
    return {
        ...body,
        levels: body.levels.map((level) =>
            level.level_type === 'TRAINING_LEVEL'
                ? { ...level, mitre_techniques: [{ technique_key: techniqueKey }] }
                : level,
        ),
    };
}
