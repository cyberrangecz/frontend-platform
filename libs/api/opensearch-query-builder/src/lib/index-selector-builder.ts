/**
 * Fluent builder for OpenSearch training-event index selectors.
 *
 * Start with `new IndexSelectorBuilder()` — it exposes `buildSelectAll()` for
 * the catch-all wildcard. Each field setter returns a `PartialIndexSelectorBuilder`
 * which exposes `build()` for a fully-qualified index (unset fields → `*`).
 *
 * Usage — wildcard:
 *
 *   const index = new IndexSelectorBuilder().buildSelectAll();
 *   // → 'crczp.events.trainings.*'
 *
 * Usage — specific:
 *
 *   const index = new IndexSelectorBuilder()
 *     .pool(1)
 *     .sandbox('abc')
 *     .definition(2)
 *     .instance(3)
 *     .run(4)
 *     .build();
 *   // → 'crczp.events.trainings.pool=1.sandbox=abc.definition=2.instance=3.run=4'
 */

import type { TrainingIndex } from './schema';

const BASE = 'crczp.events.trainings';

type IndexFields = {
    pool?:       number;
    sandbox?:    string;
    definition?: number;
    instance?:   number;
    run?:        number;
};

abstract class BaseIndexSelectorBuilder {
    protected readonly fields: IndexFields;

    constructor(fields: IndexFields = {}) {
        this.fields = fields;
    }

    // ─── Field setters ───

    pool(id: number): PartialIndexSelectorBuilder {
        return new PartialIndexSelectorBuilder({ ...this.fields, pool: id });
    }

    sandbox(id: string): PartialIndexSelectorBuilder {
        return new PartialIndexSelectorBuilder({ ...this.fields, sandbox: id });
    }

    definition(id: number): PartialIndexSelectorBuilder {
        return new PartialIndexSelectorBuilder({ ...this.fields, definition: id });
    }

    instance(id: number): PartialIndexSelectorBuilder {
        return new PartialIndexSelectorBuilder({ ...this.fields, instance: id });
    }

    run(id: number): PartialIndexSelectorBuilder {
        return new PartialIndexSelectorBuilder({ ...this.fields, run: id });
    }
}

/** Builder with no fields set — only `buildSelectAll()` is available. */
export class IndexSelectorBuilder extends BaseIndexSelectorBuilder {
    /** Returns the catch-all wildcard index `crczp.events.trainings.*`. */
    buildSelectAll(): TrainingIndex {
        return `${BASE}.*`;
    }
}

/** Builder with at least one field set — only `build()` is available. */
export class PartialIndexSelectorBuilder extends BaseIndexSelectorBuilder {
    /** Builds the fully-qualified index string. Unset fields are replaced with `*`. */
    build(): TrainingIndex {
        const { pool = '*', sandbox = '*', definition = '*', instance = '*', run = '*' } = this.fields;
        return `${BASE}.pool=${pool}.sandbox=${sandbox}.definition=${definition}.instance=${instance}.run=${run}` as TrainingIndex;
    }
}
