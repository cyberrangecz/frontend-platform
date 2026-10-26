import { TrainingDefinition, TrainingDefinitionStateEnum } from '@crczp/training-model';
import {
    Column,
    DeleteAction,
    DownloadAction,
    EditAction,
    RowAction
} from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { defer, of } from 'rxjs';
import { TrainingDefinitionService } from '../services/state/training-definition.service';
import { TrainingDefinitionRowAdapter } from './training-definition-row-adapter';
import { Routing } from '@crczp/routing-commons';
import { Utils } from '@crczp/utils';
import { TrainingDefinitionSort } from '@crczp/training-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Helper class transforming paginated resource to class for common table component
 * @dynamic
 */
export class TrainingDefinitionTable extends TableModel<
    TrainingDefinition,
    TrainingDefinitionSort
> {
    constructor(
        resource: OffsetPaginatedResource<TrainingDefinition>,
        service: TrainingDefinitionService,
    ) {
        const columns = [
            new Column<TrainingDefinitionSort>('title', 'title', true, 'title'),
            new Column<TrainingDefinitionSort>(
                'duration',
                'estimated duration',
                true,
                'estimatedDuration',
            ),
            new Column<TrainingDefinitionSort>('createdAt', 'created at', true, 'createdAt'),
            new Column<TrainingDefinitionSort>('lastEditTime', 'last edit', true, 'lastEdited'),
            new Column<TrainingDefinitionSort>(
                'lastEditBy',
                'last edit by',
                true,
                'lastEditedBy',
            ),
            new Column<TrainingDefinitionSort>('state', 'state', true, 'state'),
        ];

        const rows = resource.elements.map((definition) =>
            TrainingDefinitionTable.createRow(definition, service),
        );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterLabel = 'Filter by title';
        this.filterable = true;
        this.selectable = false;
    }

    private static createRow(
        td: TrainingDefinition,
        service: TrainingDefinitionService,
    ): LinkedRow<TrainingDefinition> {
        const adapter = td as TrainingDefinitionRowAdapter;
        adapter.duration = Utils.Date.formatDurationFull(
            td.estimatedDuration * 60,
        );
        const row = new LinkedRow(
            adapter,
            TrainingDefinitionTable.createActions(adapter, service),
        );
        row.addLink(
            'title',
            Routing.RouteBuilder.linear_definition
                .definitionId(td.id)
                .detail.build(),
        );
        return row;
    }

    private static createActions(
        td: TrainingDefinition,
        service: TrainingDefinitionService,
    ): RowAction[] {
        return [
            ...this.createBaseActions(td, service),
            ...this.createStateActions(td, service),
        ];
    }

    private static createBaseActions(
        td: TrainingDefinition,
        service: TrainingDefinitionService,
    ): RowAction[] {
        return [
            new EditAction(
                'Edit training definition',
                of(false),
                defer(() => service.edit(td.id)),
            ),
            new DeleteAction(
                'Delete training definition',
                of(false),
                defer(() => service.delete(td)),
            ),
            new RowAction(
                'clone',
                'Clone',
                'file_copy',
                'primary',
                'Clone training definition',
                of(false),
                defer(() => service.clone(td)),
            ),
            new DownloadAction(
                'Download training definition',
                of(false),
                defer(() => service.download(td)),
            ),
            new RowAction(
                'preview',
                'Preview',
                'remove_red_eye',
                'primary',
                'Preview training run',
                of(false),
                defer(() => service.preview(td.id)),
            ),
        ];
    }

    private static createStateActions(
        td: TrainingDefinition,
        service: TrainingDefinitionService,
    ): RowAction[] {
        switch (td.state) {
            case TrainingDefinitionStateEnum.Released:
                return [
                    new RowAction(
                        'unrelease',
                        'Unrelease',
                        'lock_open',
                        'primary',
                        'Unrelease training definition',
                        of(false),
                        defer(() =>
                            service.changeState(
                                td,
                                TrainingDefinitionStateEnum.Unreleased,
                            ),
                        ),
                    ),
                    new RowAction(
                        'archive',
                        'Archive',
                        'archive',
                        'warn',
                        'Archive training definition',
                        of(false),
                        defer(() =>
                            service.changeState(
                                td,
                                TrainingDefinitionStateEnum.Archived,
                            ),
                        ),
                    ),
                ];
            case TrainingDefinitionStateEnum.Unreleased:
                return [
                    new RowAction(
                        'release',
                        'Release',
                        'lock',
                        'primary',
                        'Release training definition',
                        of(false),
                        defer(() =>
                            service.changeState(
                                td,
                                TrainingDefinitionStateEnum.Released,
                            ),
                        ),
                    ),
                ];
            default:
                return [];
        }
    }
}
