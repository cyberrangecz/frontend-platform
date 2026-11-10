import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RichTooltipDirective, RichTooltipModel } from '@crczp/components';
import { AttachmentFacts, AttachmentFailure } from '../attachment/attachment-facts';
import { ATTACHMENT_KIND_ICONS, attachmentKindOf, chipDetailOf, formatBytes, formatDuration, typeLabelOf } from '../attachment/attachment-kind';
import { AttachmentPoster } from '../attachment/attachment-poster';

const MISSING_ICON = 'link_off';
const MISSING_COLOR = 'var(--mat-sys-error)';

/** Status line of the tooltip when the facts are unavailable; wording matches the file card. */
function unavailableStatusOf(failure: AttachmentFailure | undefined): string {
    if (!failure) {
        return 'No stored file has this hash';
    }
    if (failure.status === 403) {
        return "You can't open this file (HTTP 403).";
    }
    return `This file could not be loaded (${failure.status ? `HTTP ${failure.status}` : 'no response'}).`;
}

/** First and last characters of a hash, joined by an ellipsis. */
function shortHashOf(hash: string): string {
    return hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash;
}

/**
 * What the source editor shows in place of one attachment reference: a thumbnail (the poster of an
 * image or a video) or the kind icon, the name and the size. It reads the stored facts through the
 * attachment source and turns red when no file has the hash. Hovering it shows the facts in the
 * shared rich tooltip.
 */
@Component({
    selector: 'crczp-attachment-chip',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule, RichTooltipDirective],
    templateUrl: './attachment-chip.component.html',
    styleUrl: './attachment-chip.component.scss',
})
export class AttachmentChipComponent {
    readonly hash = input.required<string>();
    /** Label written in the reference. */
    readonly label = input('');
    /** Display width saved in the reference, in CSS px. */
    readonly maxWidth = input<number>();

    private readonly facts = new AttachmentFacts(() => this.hash());
    private readonly metadata = this.facts.metadata;
    private readonly kind = computed(() => {
        const metadata = this.metadata();
        return metadata && attachmentKindOf(metadata);
    });
    private readonly poster = new AttachmentPoster(() => {
        const kind = this.kind();
        return kind === 'video' || kind === 'image' ? this.hash() : undefined;
    });

    protected readonly state = computed(() => {
        if (this.facts.loading()) {
            return 'loading';
        }
        return this.metadata() ? 'ready' : 'missing';
    });
    protected readonly name = computed(() => this.label() || this.metadata()?.fileName || 'Unnamed file');
    protected readonly icon = computed(() => {
        const kind = this.kind();
        if (kind) {
            return ATTACHMENT_KIND_ICONS[kind];
        }
        return this.state() === 'loading' ? ATTACHMENT_KIND_ICONS.file : MISSING_ICON;
    });
    protected readonly detail = computed(() => {
        const metadata = this.metadata();
        if (metadata) {
            return chipDetailOf(formatBytes(metadata.size), this.maxWidth());
        }
        return this.state() === 'loading' ? '' : 'unavailable';
    });
    protected readonly thumbnailUrl = this.poster.url;
    protected readonly tooltip = computed<RichTooltipModel>(() => {
        const metadata = this.metadata();
        if (!metadata) {
            return {
                title: this.name(),
                titleIcon: MISSING_ICON,
                titleColor: MISSING_COLOR,
                rows: [
                    { label: 'Status', value: unavailableStatusOf(this.facts.failure()), valueColor: MISSING_COLOR },
                    { label: 'Hash', value: shortHashOf(this.hash()) },
                ],
            };
        }
        const { width, height, durationSeconds } = metadata;
        return {
            title: metadata.fileName,
            titleIcon: this.icon(),
            rows: [
                { label: 'Type', value: typeLabelOf(metadata) },
                { label: 'Size', value: formatBytes(metadata.size) },
                ...(width && height ? [{ label: 'Dimensions', value: `${width} × ${height}` }] : []),
                ...(durationSeconds === undefined ? [] : [{ label: 'Duration', value: formatDuration(durationSeconds) }]),
                { label: 'Hash', value: shortHashOf(this.hash()) },
            ],
        };
    });
}
