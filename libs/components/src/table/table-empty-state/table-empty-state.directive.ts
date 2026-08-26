import { ComponentRef, DestroyRef, Directive, DoCheck, ElementRef, inject, input, ViewContainerRef } from '@angular/core';
import { SentinelTableComponent } from '@sentinel/components/table';
import { TableEmptyRowComponent } from './table-empty-row.component';

const DEFAULT_MESSAGE = 'No records to display';

/**
 * States beneath the header row of a `sentinel-table` that the table holds no records.
 * The message appears only once the table is known to be genuinely empty — while a
 * request is in flight or has failed, nothing is shown, so a table that has not yet
 * received its first page stays blank instead of claiming to be empty.
 *
 * The host table must bind its loading state for that distinction to hold, since a
 * paginated data source publishes an empty page before its first request resolves.
 */
@Directive({
    selector: 'sentinel-table[crczpTableEmptyState]',
})
export class TableEmptyStateDirective implements DoCheck {
    /** Sentence naming what the table would list if it held anything. */
    readonly message = input(DEFAULT_MESSAGE, {
        alias: 'crczpTableEmptyState',
        transform: (message: string) => message?.trim() || DEFAULT_MESSAGE,
    });

    private readonly table = inject(SentinelTableComponent);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly viewContainer = inject(ViewContainerRef);
    private row: ComponentRef<TableEmptyRowComponent> | undefined;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.hide());
    }

    ngDoCheck(): void {
        if (this.isEmpty()) {
            this.show();
        } else {
            this.hide();
        }
    }

    /** True while the table holds no rows and is neither loading them nor reporting a failure. */
    private isEmpty(): boolean {
        return !this.table.isLoading && !this.table.hasError && (this.table.data?.rows.length ?? 0) === 0;
    }

    /** Renders the message row into the table body, keeping its content, span and placement current. */
    private show(): void {
        const body = this.host.nativeElement.querySelector('tbody');
        if (!body) {
            return;
        }
        this.row ??= this.viewContainer.createComponent(TableEmptyRowComponent);
        const rowElement: HTMLElement = this.row.location.nativeElement;
        if (rowElement.parentElement !== body) {
            body.appendChild(rowElement);
        }
        this.row.setInput('message', this.message());
        this.row.setInput('columnCount', this.table.displayedColumns.length);
    }

    /** Removes the message row if one is currently rendered. */
    private hide(): void {
        if (!this.row) {
            return;
        }
        (this.row.location.nativeElement as HTMLElement).remove();
        this.row.destroy();
        this.row = undefined;
    }
}
