import { ACCOUNTS } from '../../accounts';
import type { Api } from '../../api/api-client';
import { displayNameOf } from '../common/role-agendas';
import { ATTACHMENT_LIST, type AttachmentFixture } from '../../scenario/attachment-fixtures';
import {
    archiveOf,
    type MetadataSupplier,
    type ParsedArchive,
    parseArchive,
    ZIP_MEDIA_TYPE,
} from '../../scenario/definition-archive';
import { sharedTrainingImport, trainingImportWithoutAttachments } from '../../scenario/shared-training-loader';

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

/**
 * Imports a definition from an import document. The stored files its content references, and
 * the extra files given, travel with it in a ZIP archive; a document that references none is
 * posted as plain JSON.
 */
export function importDefinitionBody(
    api: Api,
    body: unknown,
    extraFiles: readonly AttachmentFixture[] = [],
    metadataOf?: MetadataSupplier,
): Promise<DefinitionDto> {
    const text = JSON.stringify(body);
    const referenced = ATTACHMENT_LIST.filter(
        ({ hash }) => text.includes(`attachment:${hash}`) && !extraFiles.some((extra) => extra.hash === hash),
    );
    const files = [...referenced, ...extraFiles];
    return files.length === 0
        ? api.training.post<DefinitionDto>('/imports/training-definitions', body)
        : importDefinitionArchive(api, archiveOf(body as Record<string, unknown>, files, metadataOf));
}

/** Imports a definition from ZIP bytes. */
export function importDefinitionArchive(api: Api, archive: Uint8Array): Promise<DefinitionDto> {
    return api.training.postBytes<DefinitionDto>('/imports/training-definitions', archive, ZIP_MEDIA_TYPE);
}

export function fetchDefinition(api: Api, definitionId: number): Promise<DefinitionDto> {
    return api.training.get<DefinitionDto>(`/training-definitions/${definitionId}`);
}

/** An export answer, told apart by its Content-Type. */
export type DefinitionExport =
    | { kind: 'json'; document: Record<string, unknown> }
    | { kind: 'zip'; fileName: string; bytes: Buffer; archive: ParsedArchive; document: Record<string, unknown> };

/** Exports a definition, accepting both a plain JSON and a ZIP answer. */
export async function exportDefinitionAnswer(api: Api, definitionId: number): Promise<DefinitionExport> {
    const answer = await api.training.getBinary(
        `/exports/training-definitions/${definitionId}`,
        `${ZIP_MEDIA_TYPE}, application/json`,
    );
    if (answer.contentType === ZIP_MEDIA_TYPE) {
        const archive = parseArchive(answer.bytes);
        const fileName = /filename="?([^";]+)"?/i.exec(answer.contentDisposition)?.[1] ?? '';
        return { kind: 'zip', fileName, bytes: answer.bytes, archive, document: archive.document };
    }
    if (answer.contentType !== 'application/json') {
        throw new Error(`The export answered the unexpected media type "${answer.contentType}"`);
    }
    return { kind: 'json', document: JSON.parse(answer.bytes.toString('utf-8')) as Record<string, unknown> };
}

/** Exports a definition and answers its definition document, whether the export is a JSON file or a ZIP. */
export async function exportDefinition(api: Api, definitionId: number): Promise<Record<string, unknown>> {
    return (await exportDefinitionAnswer(api, definitionId)).document;
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

/** Import-format document of a definition holding one info level with the given content. */
export function definitionWithInfoLevel(title: string, content: string): Record<string, unknown> {
    return {
        ...trainingImportWithoutAttachments(title),
        levels: [{ level_type: 'INFO_LEVEL', title: 'Briefing', estimated_duration: 1, content }],
    };
}

export interface MaterialDto {
    hash: string;
    fileName: string;
    mediaType: string;
    durationSeconds: number | null;
    width: number | null;
    height: number | null;
}

/** The training materials a definition stores, with the media metadata the server holds for each. */
export async function fetchMaterials(api: Api, definitionId: number): Promise<MaterialDto[]> {
    const list = await api.training.get<{ materials: MaterialDto[] }>(
        `/training-definitions/${definitionId}/attachments`,
    );
    return list.materials;
}

/** The hashes of the training materials a definition stores, placed in content or not. */
export async function fetchMaterialHashes(api: Api, definitionId: number): Promise<string[]> {
    return (await fetchMaterials(api, definitionId)).map(({ hash }) => hash);
}
