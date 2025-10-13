import { VMImagesRowAdapter } from './vm-images-row-adapter';
import {
    Column,
    ExpandableSentinelTable,
    Row,
    RowExpand,
} from '@sentinel/components/table';
import { PaginatedResource } from '@sentinel/common/pagination';
import { VirtualImage } from '@crczp/sandbox-model';
import { VMImageDetailComponent } from '../components/vm-image-detail/vm-image-detail.component';
import { formatDate } from '@angular/common';

export class VirtualImagesTable extends ExpandableSentinelTable<
    VMImagesRowAdapter,
    VMImageDetailComponent,
    null,
    string
> {
    constructor(resource: PaginatedResource<VirtualImage>) {
        const rows = resource.elements.map((element) =>
            VirtualImagesTable.createRow(element),
        );
        const columns = [
            new Column<string>('name', 'name', true, 'name'),
            new Column<string>('defaultUser', 'default user', false),
            new Column<string>(
                'updatedAtFormatted',
                'updated at',
                true,
                'updated_at',
            ),
            new Column<string>('guiAccessFormatted', 'GUI access', false),
            new Column<string>('sizeFormatted', 'size (GB)', false),
        ];
        const expand = new RowExpand(VMImageDetailComponent, null);
        super(rows, columns, expand);
        this.pagination = resource.pagination;
        this.filterable = true;
        this.filterLabel = 'Filter by name';
    }

    private static createRow(image: VirtualImage): Row<VMImagesRowAdapter> {
        const rowAdapter = image as VMImagesRowAdapter;
        rowAdapter.updatedAtFormatted = formatDate(
            rowAdapter.updatedAt,
            'd MMM yyyy H:mm',
            'en-US',
        );
        rowAdapter.createdAtFormatted = formatDate(
            rowAdapter.createdAt,
            'd MMM yyyy H:mm',
            'en-US',
        );
        rowAdapter.guiAccessFormatted = image.ownerSpecified.guiAccess
            ? 'Yes'
            : 'No';
        rowAdapter.sizeFormatted = Math.round(image.size * 10) / 10;
        return new Row<VMImagesRowAdapter>(rowAdapter);
    }
}
