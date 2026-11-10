import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ATTACHMENT_KIND_ICONS, attachmentKindOf } from '../attachment/attachment-kind';
import { AttachmentPoster } from '../attachment/attachment-poster';
import { AttachmentMetadata } from '../attachment/attachment-source';

/** A small picture of a stored file: the poster of an image or a video, or else the icon of its kind. */
@Component({
    selector: 'crczp-attachment-thumbnail',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule],
    templateUrl: './attachment-thumbnail.component.html',
    styleUrl: './attachment-thumbnail.component.scss',
})
export class AttachmentThumbnailComponent {
    readonly metadata = input.required<AttachmentMetadata>();

    private readonly kind = computed(() => attachmentKindOf(this.metadata()));
    private readonly poster = new AttachmentPoster(() => {
        const kind = this.kind();
        return kind === 'video' || kind === 'image' ? this.metadata().hash : undefined;
    });

    protected readonly icon = computed(() => ATTACHMENT_KIND_ICONS[this.kind()]);
    protected readonly pictureUrl = this.poster.url;
}
