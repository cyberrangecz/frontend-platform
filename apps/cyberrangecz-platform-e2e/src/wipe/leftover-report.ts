/** One entity the wipe or the preparation could not bring to its intended state. */
export interface Leftover {
    kind: string;
    id: number | string;
    label?: string;
    reason: string;
}

/** Collects leftovers instead of stopping at the first one, so one run reports them all. */
export class LeftoverReport {
    readonly leftovers: Leftover[] = [];

    add(leftover: Leftover): void {
        this.leftovers.push(leftover);
    }

    /** Runs an action, recording its failure as a leftover of the given entity. */
    async attempt(
        entity: Omit<Leftover, 'reason'>,
        action: () => Promise<unknown>,
    ): Promise<boolean> {
        try {
            await action();
            return true;
        } catch (error) {
            this.add({ ...entity, reason: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
}
