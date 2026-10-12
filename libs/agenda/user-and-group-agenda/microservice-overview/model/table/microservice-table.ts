import { Column } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { Microservice } from '@crczp/user-and-group-model';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * @dynamic
 * Class creating data source for microservice-overview table
 */
export class MicroserviceTable extends TableModel<Microservice, string> {
    constructor(resource: OffsetPaginatedResource<Microservice>) {
        const rows = resource.elements.map((element) =>
            MicroserviceTable.createRow(element),
        );
        const columns = [
            new Column<string>('id', 'id', true, 'id'),
            new Column<string>('name', 'name', true, 'name'),
            new Column<string>('endpoint', 'endpoint', true, 'endpoint'),
        ];
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = true;
        this.filterLabel = 'Filter by name';
        this.selectable = false;
    }

    private static createRow(microservice: Microservice): LinkedRow<Microservice> {
        return new LinkedRow(microservice);
    }
}
