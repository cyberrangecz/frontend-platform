import { Parser } from '@json2csv/plainjs';
import { BlobFileSaver } from '@crczp/api-common';
import { CsvExportable } from './csv-exportable';

/**
 * Serializes a panel's displayed rows to CSV via @json2csv/plainjs and triggers a
 * download through the repo's BlobFileSaver (file-saver). The column definitions map
 * directly onto json2csv field selectors: header becomes the label, the accessor
 * becomes the value getter.
 *
 * Awaits {@link CsvExportable.csvRows} so panels may resolve rows on demand
 * (e.g. fetching entity names at export time) without blocking the polling loop.
 *
 * @param exportable  The panel implementing the export contract.
 */
export async function exportCsv<Row>(exportable: CsvExportable<Row>): Promise<void> {
    const fields = exportable.csvColumns().map((column) => ({ label: column.header, value: column.value as (row: object) => unknown }));
    const rows = await exportable.csvRows();
    const csv = new Parser({ fields }).parse([...rows] as object[]);
    const filename = exportable.csvFilename();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    BlobFileSaver.saveBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}
