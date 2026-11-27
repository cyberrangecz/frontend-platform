import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AttachmentSource } from './attachment-source';
import { TrainingMaterials } from './training-materials';

/** A lookup that failed for a reason other than a missing file; the status is absent when the request got no HTTP response. */
export interface AttachmentFailure {
    readonly status?: number;
}

/**
 * Reads the stored facts of an attachment through the injected source and exposes them as
 * signals. When the training materials are provided, the lookup repeats as soon as a file with
 * the hash becomes available or stops being available, so a reference to a file picked, dropped
 * or removed later shows the new state. A lookup that errors is exposed as a failure, which
 * `retry` repeats. Nothing loads while the hash getter returns undefined.
 * Created in an injection context.
 */
export class AttachmentFacts {
    private readonly source = inject(AttachmentSource);
    private readonly materials = inject(TrainingMaterials, { optional: true });

    private readonly currentHash = computed(() => this.hash());
    private readonly available = computed(() => this.materials?.materials().some((material) => material.hash === this.currentHash()));

    private readonly resource = rxResource({
        params: () => {
            const hash = this.currentHash();
            return hash === undefined ? undefined : { hash, available: this.available() };
        },
        stream: ({ params }) => this.source.metadata(params.hash),
    });

    readonly metadata = computed(() => (this.resource.hasValue() ? this.resource.value() : undefined));
    readonly loading = this.resource.isLoading;
    readonly failure = computed<AttachmentFailure | undefined>(() => {
        const error: unknown = this.resource.error();
        if (error === undefined) {
            return undefined;
        }
        const status = (error as { status?: unknown } | null)?.status;
        return typeof status === 'number' && status > 0 ? { status } : {};
    });

    retry(): void {
        this.resource.reload();
    }

    constructor(private readonly hash: () => string | undefined) {}
}
