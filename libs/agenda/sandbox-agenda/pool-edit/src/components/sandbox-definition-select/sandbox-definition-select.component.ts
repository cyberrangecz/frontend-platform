import { ChangeDetectionStrategy, Component, DestroyRef, inject, Inject, Input, OnInit, Optional } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { SandboxDefinition } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    DefaultPaginationService,
    SandboxDefinitionOverviewConcreteService,
    SandboxDefinitionOverviewService,
} from '@crczp/sandbox-agenda/internal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-sandbox-definition-select',
    templateUrl: './sandbox-definition-select.component.html',
    styleUrls: ['./sandbox-definition-select.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{ provide: SandboxDefinitionOverviewService, useClass: SandboxDefinitionOverviewConcreteService }],
})
export class SandboxDefinitionSelectComponent implements OnInit {
    @Input() paginationId = 'crczp-sandbox-definition-select';
    readonly PAGE_SIZE: number;

    definitions$: Observable<PaginatedResource<SandboxDefinition>>;
    isLoading$: Observable<boolean>;
    hasError$: Observable<boolean>;

    selected: SandboxDefinition[];
    destroyRef = inject(DestroyRef);

    constructor(
        @Optional() @Inject(MAT_DIALOG_DATA) public preselected: SandboxDefinition,
        public dialogRef: MatDialogRef<SandboxDefinitionSelectComponent>,
        private paginationService: PaginationStorageService,
        private definitionService: SandboxDefinitionOverviewService,
    ) {
        this.selected = [preselected];
        this.PAGE_SIZE = this.paginationService.loadPageSize();
    }

    ngOnInit(): void {
        this.definitions$ = this.definitionService.resource$;
        this.isLoading$ = this.definitionService.isLoading$;
        this.hasError$ = this.definitionService.hasError$;
        this.definitionService
            .getAll(new OffsetPaginationEvent(0, Number.MAX_SAFE_INTEGER, '', 'asc'))
            .pipe(
                map((resources) => {
                    resources.elements.map(
                        (definition) =>
                            (definition.title = `${definition.title} (ID: ${definition.id}, rev: ${definition.rev})`),
                    );
                    return resources;
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    fetch(pagination: OffsetPaginationEvent): void {
        this.paginationService.savePageSize(pagination.size);
        this.definitionService
            .getAll(new OffsetPaginationEvent(0, Number.MAX_SAFE_INTEGER, '', 'asc'))
            .pipe(
                map((resources) => {
                    resources.elements.map(
                        (definition) =>
                            (definition.title = `${definition.title} (ID: ${definition.id}, rev: ${definition.rev})`),
                    );
                    return resources;
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    confirm(): void {
        this.dialogRef.close(this.selected[0]);
    }

    cancel(): void {
        this.dialogRef.close(undefined);
    }

    /**
     * Updated selected sandbox definition
     * @param selected selected sandbox definition
     */
    onSelectionChange(selected: SandboxDefinition[]): void {
        this.selected = selected;
    }

    /**
     * Compares two {@link SandboxDefinition} objects by their IDs
     * @param a first {@link SandboxDefinition} object
     * @param b second {@link SandboxDefinition} object
     * @returns true if IDs are equal, false otherwise
     */
    sandboxDefinitionIdentity(a: SandboxDefinition, b: SandboxDefinition): boolean {
        return a.id === b.id;
    }
}
