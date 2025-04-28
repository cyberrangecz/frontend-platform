import { Column, ExpandableSentinelTable, Row, RowExpand } from '@sentinel/components/table';
import { CommandDetailComponent } from './detail/command-detail.component';
import { AggregatedCommands } from '@crczp/visualization-model';


export class CommandTable extends ExpandableSentinelTable<AggregatedCommands, CommandDetailComponent, null> {
    constructor(resource: AggregatedCommands[]) {
        const columns = [
            new Column('cmd', 'command', true, 'cmd'),
            new Column('commandType', 'command type', true, 'commandType'),
            new Column('frequency', 'frequency', true, 'frequency'),
        ];
        const rows = resource.map((command) => new Row(command));
        const expand = new RowExpand(CommandDetailComponent, null);

        super(rows, columns, expand);
    }
}
