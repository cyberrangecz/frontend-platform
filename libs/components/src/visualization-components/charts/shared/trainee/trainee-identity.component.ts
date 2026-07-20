import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OverflowTooltipDirective } from '@crczp/utils';
import { avatarDataUrl, nameInitial } from './avatar-identity';

/**
 * Inline trainee identity: the trainee's avatar picture and display name rendered
 * together as one inseparable unit, so a name is never shown without its avatar.
 * When no picture is available, an initial-letter placeholder fills the avatar slot.
 */
@Component({
    selector: 'crczp-trainee-identity',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OverflowTooltipDirective],
    templateUrl: './trainee-identity.component.html',
    styleUrl: './trainee-identity.component.scss',
})
export class TraineeIdentityComponent {
    /** Trainee display name shown beside the avatar. */
    readonly name = input.required<string>();

    /** Raw base64-encoded avatar image without a data-URL prefix; empty when none. */
    readonly picture = input<string>('');

    /** Data-URL form of the avatar picture, or null when no picture is provided. */
    protected readonly pictureSrc = computed<string | null>(() => avatarDataUrl(this.picture()));

    /** Uppercase leading character of the name, used for the no-picture placeholder. */
    protected readonly initial = computed<string>(() => nameInitial(this.name()));
}
