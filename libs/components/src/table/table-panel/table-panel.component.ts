import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, inject, input, linkedSignal, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { SentinelTableComponent, TableColumnVisibilityService } from '@sentinel/components/table';

/**
 * Frames one projected `sentinel-table` with a toolbar row above it, holding an optional text
 * filter on the left and the content marked `tablePanelActions` on the right, and with a menu
 * choosing the visible columns at the right end of the table's header row. The table shares its
 * column visibility state with the panel and therefore leaves out its own toolbar.
 */
@Component({
    selector: 'crczp-table-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [TableColumnVisibilityService],
    imports: [
        MatFormField,
        MatInput,
        MatSuffix,
        MatIcon,
        MatIconButton,
        MatCheckbox,
        MatMenu,
        MatMenuItem,
        MatMenuTrigger,
        MatTooltip,
        TitleCasePipe,
    ],
    templateUrl: './table-panel.component.html',
    styleUrl: './table-panel.component.scss',
})
export class TablePanelComponent {
    /** Label of the text filter; no filter is shown while it is empty. */
    readonly filterLabel = input('');
    /** Text the filter starts from. */
    readonly filterValue = input('');
    /** Emits the filter text on every change, an empty string once the filter is cleared. */
    readonly filterChange = output<string>();

    protected readonly visibility = inject(TableColumnVisibilityService);
    protected readonly table = contentChild.required(SentinelTableComponent);
    protected readonly filterText = linkedSignal(() => this.filterValue());
    protected readonly showColumnMenu = computed(
        () => this.table().enableColumnVisibility() && this.visibility.viewColumns().length > 0,
    );

    protected onFilterInput(text: string): void {
        this.filterText.set(text);
        this.filterChange.emit(text);
    }
}
