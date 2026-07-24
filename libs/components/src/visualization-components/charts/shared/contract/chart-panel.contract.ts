import { InputSignal } from '@angular/core';
import { CsvExportable } from '../csv/csv-exportable';

/** Scope every dashboard panel receives: primitive identifiers arrive via inputs. */
export interface ChartPanelInputs {
    readonly instanceId: InputSignal<number>;
}

/** Trainee-view panels additionally scope to a single run. */
export interface TraineePanelInputs extends ChartPanelInputs {
    readonly runId: InputSignal<number | undefined>;
}

/**
 * Level-scoped panels own their level picker but accept an optional external
 * override, so an embedder can drive the selected level from its own state.
 */
export interface LevelScopedPanelInputs {
    readonly levelId: InputSignal<number | null | undefined>;
}

/**
 * The common panel contract: scope inputs plus the CSV export surface. A panel
 * `implements ChartPanel<Row>`, which the compiler enforces member-by-member,
 * without inheriting any behavior.
 *
 * @typeParam Row - shape of one exported (displayed) data point
 */
export interface ChartPanel<Row> extends ChartPanelInputs, CsvExportable<Row> {}
