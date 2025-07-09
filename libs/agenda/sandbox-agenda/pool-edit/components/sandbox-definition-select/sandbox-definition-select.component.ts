import {ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle,
} from '@angular/material/dialog';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {SandboxDefinition} from '@crczp/sandbox-model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {
    SandboxDefinitionOverviewConcreteService,
    SandboxDefinitionOverviewService,
} from '@crczp/sandbox-agenda/internal';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SentinelListComponent, SentinelListElementDirective,} from '@sentinel/components/list';
import {MatButton} from '@angular/material/button';
import {AsyncPipe} from '@angular/common';
import {MatDivider} from '@angular/material/divider';
import {PaginationStorageService, providePaginationStorageService} from '@crczp/common';

@Component({
    selector: 'crczp-sandbox-definition-select',
    templateUrl: './sandbox-definition-select.component.html',
    styleUrls: ['./sandbox-definition-select.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: SandboxDefinitionOverviewService,
            useClass: SandboxDefinitionOverviewConcreteService,
        },
        providePaginationStorageService(SandboxDefinitionSelectComponent)
    ],
    imports: [
        MatDialogContent,
        SentinelListComponent,
        MatDialogActions,
        MatButton,
        MatDialogTitle,
        AsyncPipe,
        SentinelListElementDirective,
        MatDivider,
    ],
})
export class SandboxDefinitionSelectComponent implements OnInit {
    preselected = inject<SandboxDefinition>(MAT_DIALOG_DATA, {optional: true});
    dialogRef = inject<MatDialogRef<SandboxDefinitionSelectComponent>>(MatDialogRef);
    @Input() paginationId = 'crczp-sandbox-definition-select';
    readonly PAGE_SIZE: number;
    definitions$: Observable<PaginatedResource<SandboxDefinition>>;
    isLoading$: Observable<boolean>;
    hasError$: Observable<boolean>;
    selected: SandboxDefinition[];
    destroyRef = inject(DestroyRef);
    private paginationService = inject(PaginationStorageService);
    private definitionService = inject(SandboxDefinitionOverviewService);

    constructor() {
        const preselected = this.preselected;

        this.selected = [preselected];
        this.PAGE_SIZE = this.paginationService.loadPageSize();
    }

    ngOnInit(): void {
        this.definitions$ = this.definitionService.resource$;
        this.isLoading$ = this.definitionService.isLoading$;
        this.hasError$ = this.definitionService.hasError$;
        this.definitionService
            .getAll(
                new OffsetPaginationEvent(0, Number.MAX_SAFE_INTEGER, '', 'asc')
            )
            .pipe(
                map((resources) => {
                    resources.elements.map(
                        (definition) =>
                            (definition.title = `${definition.title} (ID: ${definition.id}, rev: ${definition.rev})`)
                    );
                    return resources;
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
        this.fetch(new OffsetPaginationEvent(0, Number.MAX_SAFE_INTEGER, '', 'asc'));
    }

    fetch(pagination: OffsetPaginationEvent): void {
        this.paginationService.savePageSize(pagination.size);
        this.definitionService
            .getAll(
                pagination
            )
            .pipe(
                map((resources) => {
                    resources.elements.map(
                        (definition) =>
                            (definition.title = `${definition.title} (ID: ${definition.id}, rev: ${definition.rev})`)
                    );
                    return resources;
                }),
                takeUntilDestroyed(this.destroyRef)
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
    sandboxDefinitionIdentity(
        a: SandboxDefinition,
        b: SandboxDefinition
    ): boolean {
        return a.id === b.id;
    }

}
