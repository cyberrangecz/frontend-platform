import { SandboxDefinition } from '@crczp/sandbox-model';
import { Column, DeleteAction, ExpandableSentinelTable, Row, RowAction, RowExpand } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import {
    SandboxDefinitionDetailComponent
} from '../components/sandbox-definition-detail/sandbox-definition-detail.component';
import { SandboxDefinitionOverviewService } from '@crczp/sandbox-agenda/internal';
import { SandboxDefinitionRowAdapter } from './sandbox-definition-row-adapter';
import { SandboxDefinitionSort } from '@crczp/sandbox-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Helper class transforming paginated resource to class for common table component
 */
export class SandboxDefinitionTable extends ExpandableSentinelTable<
    SandboxDefinition,
    SandboxDefinitionDetailComponent,
    null,
    SandboxDefinitionSort
> {
    constructor(
        resource: OffsetPaginatedResource<SandboxDefinition>,
        service: SandboxDefinitionOverviewService,
    ) {
        const columns = [
            new Column<SandboxDefinitionSort>('id', 'id', true, 'id'),
            new Column<SandboxDefinitionSort>(
                'titleWithRevision',
                'title',
                true,
                'name',
            ),
            new Column<SandboxDefinitionSort>(
                'createdByName',
                'Created by',
                false,
            ),
        ];
        const rows = resource.elements.map((element) =>
            SandboxDefinitionTable.createRow(element, service),
        );
        const expand = new RowExpand(SandboxDefinitionDetailComponent, null);
        super(rows, columns, expand);
        this.pagination = resource.pagination;
        this.filterable = false;
        this.selectable = false;
    }

    private static createRow(
        sandboxDefinition: SandboxDefinition,
        service: SandboxDefinitionOverviewService,
    ): Row<SandboxDefinitionRowAdapter> {
        const actions = [
            new RowAction(
                'topology',
                'Topology',
                'device_hub',
                'primary',
                'Display topology',
                of(false),
                defer(() => service.showTopology(sandboxDefinition)),
            ),
            new DeleteAction(
                'Delete sandbox definition',
                of(false),
                defer(() => service.delete(sandboxDefinition)),
            ),
        ];
        const rowAdapter = sandboxDefinition as SandboxDefinitionRowAdapter;
        rowAdapter.createdByName = sandboxDefinition.createdBy.fullName;
        rowAdapter.titleWithRevision =
            sandboxDefinition.title + ' (' + sandboxDefinition.rev + ')';
        const row = new Row(rowAdapter, actions);
        row.addLink(
            'titleWithRevision',
            this.parseUrl(sandboxDefinition.url),
            '_blank',
        );
        return row;
    }

    private static parseUrl(gitUrl: string): string {
        // handle git@ URLs
        gitUrl = gitUrl.replace(/^git@(.*?):/, 'https://$1/');
        // remove the .git suffix
        gitUrl = gitUrl.replace(/\.git$/, '');

        return gitUrl;
    }
}
