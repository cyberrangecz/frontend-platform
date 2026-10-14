import { Column } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { Microservice } from '@crczp/user-and-group-model';
import { OffsetPaginatedResource } from '@crczp/api-common';
import { MicroserviceSort } from '@crczp/user-and-group-api';

/**
 * @dynamic
 * Class creating data source for microservice-overview table
 */
export class MicroserviceTable extends TableModel<Microservice, MicroserviceSort> {
    constructor(resource: OffsetPaginatedResource<Microservice>) {
        const rows = resource.elements.map((element) =>
            MicroserviceTable.createRow(element),
        );
        const columns = [
            new Column<MicroserviceSort>('id', 'id', true, 'id'),
            new Column<MicroserviceSort>('name', 'name', true, 'name'),
            new Column<MicroserviceSort>('endpoint', 'endpoint', true, 'endpoint'),
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
