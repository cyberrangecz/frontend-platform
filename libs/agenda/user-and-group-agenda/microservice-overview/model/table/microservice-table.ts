import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { PaginatedResource } from '@sentinel/common/pagination';
import { Microservice } from '@crczp/user-and-group-model';

/**
 * @dynamic
 * Class creating data source for microservice-overview table
 */
export class MicroserviceTable extends SentinelTable<Microservice, string> {
    constructor(resource: PaginatedResource<Microservice>) {
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

    private static createRow(microservice: Microservice): Row<Microservice> {
        return new Row(microservice);
    }
}
