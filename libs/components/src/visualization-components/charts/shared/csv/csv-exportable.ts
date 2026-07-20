/** One column of a CSV export: a header and a cell accessor over a displayed row. */
export interface CsvColumn<Row> {
    readonly header: string;
    readonly value: (row: Row) => string | number | boolean | null;
}

/**
 * Contract a panel implements to expose its displayed data points for CSV export.
 * Declared as an abstract class so panels `implements CsvExportable<Row>` and the
 * compiler enforces every member — equivalent enforcement to an abstract base, with
 * zero inheritance. The shell reads it through its `[exportable]` input.
 *
 * @typeParam Row - shape of one exported (displayed) data point
 */
export abstract class CsvExportable<Row> {
    /** File name (without extension) for the downloaded CSV. */
    abstract csvFilename(): string;
    /** Column definitions, in output order. Always synchronous — used by the shell tooltip. */
    abstract csvColumns(): ReadonlyArray<CsvColumn<Row>>;
    /**
     * The data points to export. May return a Promise when rows require on-demand
     * resolution (e.g. fetching entity names only at export time rather than
     * continuously during polling).
     */
    abstract csvRows(): ReadonlyArray<Row> | Promise<ReadonlyArray<Row>>;
}
