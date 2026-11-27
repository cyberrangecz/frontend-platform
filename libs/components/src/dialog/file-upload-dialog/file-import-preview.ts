import { InputSignal, Type } from '@angular/core';
import { Observable } from 'rxjs';

/** What a reader makes of one picked file: the entities it holds, or why the file is refused. */
export type FileReadResult<Entity> = { entities: readonly Entity[] } | { rejection: string };

/**
 * Describes how an import dialog previews the files it picks. A reader turns a file into
 * entities or a rejection reason; the card component renders one entity through its required
 * `entity` input. A rejected file is never uploaded.
 */
export interface FileImportPreview<Entity = unknown> {
    readonly cardComponent: Type<{ readonly entity: InputSignal<Entity> }>;

    /** Emits one result and completes. */
    readFile(file: File): Observable<FileReadResult<Entity>>;
}
