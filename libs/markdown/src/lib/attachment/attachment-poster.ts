import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { defaultIfEmpty, map } from 'rxjs';
import { AttachmentContent, AttachmentSource } from './attachment-source';

/**
 * Loads the stored poster of an attachment through the injected source and exposes it as an
 * object URL, null while loading or when the file has no poster. Nothing loads while the hash
 * getter returns undefined. Created in an injection context; releases the object URL it created
 * on destroy, never one the source owns.
 */
export class AttachmentPoster {
    private readonly source = inject(AttachmentSource);
    private objectUrl?: string;

    private readonly resource = rxResource({
        params: () => this.hash(),
        stream: ({ params }) =>
            this.source.poster(params).pipe(
                defaultIfEmpty(undefined),
                map((content) => this.replaceObjectUrl(content)),
            ),
    });

    readonly url = computed(() => (this.resource.hasValue() ? (this.resource.value() ?? null) : null));
    readonly loading = this.resource.isLoading;

    constructor(private readonly hash: () => string | undefined) {
        inject(DestroyRef).onDestroy(() => this.replaceObjectUrl(undefined));
    }

    private replaceObjectUrl(content: AttachmentContent | undefined): string | undefined {
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
        }
        if (!content) {
            this.objectUrl = undefined;
            return undefined;
        }
        if ('url' in content) {
            this.objectUrl = undefined;
            return content.url;
        }
        this.objectUrl = URL.createObjectURL(content.blob);
        return this.objectUrl;
    }
}
