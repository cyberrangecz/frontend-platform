import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { EMPTY_SUFFIX, EMPTY_SUFFIX_LABEL } from './file-suffix';

/**
 * Compact select narrowing a file list to one suffix. The first option clears the choice; the
 * empty suffix is listed as its own option.
 */
@Component({
    selector: 'crczp-suffix-filter',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './suffix-filter.component.html',
    styleUrl: './suffix-filter.component.scss',
})
export class SuffixFilterComponent {
    /** Suffixes on offer, in display order. */
    readonly suffixes = input.required<readonly string[]>();
    /** The chosen suffix; null stands for every suffix. */
    readonly value = model<string | null>(null);

    protected labelOf(suffix: string): string {
        return suffix === EMPTY_SUFFIX ? EMPTY_SUFFIX_LABEL : `.${suffix}`;
    }

    /** Applies the choice at the select's index, where index 0 is the option showing every suffix. */
    protected choose(optionIndex: number): void {
        this.value.set(this.suffixes()[optionIndex - 1] ?? null);
    }
}
