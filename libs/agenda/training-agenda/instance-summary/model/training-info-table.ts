import { Column } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { TrainingRunInfo } from '@crczp/training-model';

/**
 * @dynamic
 */
export class TrainingInfoTable extends TableModel<TrainingRunInfo, string> {
    constructor(resource: TrainingRunInfo[]) {
        const columns = [
            new Column<string>('levelId', 'level id', false),
            new Column<string>('levelOrder', 'level order', false),
            new Column<string>('levelTitle', 'level title', false),
            new Column<string>('correctAnswer', 'correct answer', false),
            new Column<string>('variableName', 'variable name', false),
        ];
        const rows = resource.map((element) =>
            TrainingInfoTable.createRow(element),
        );
        super(rows, columns);
        this.filterable = false;
    }

    static createRow(element: TrainingRunInfo): LinkedRow<TrainingRunInfo> {
        element.variableName = element.variableName
            ? element.variableName
            : '-';
        return new LinkedRow(element);
    }
}
