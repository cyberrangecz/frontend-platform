import { Signal } from '@angular/core';
import { MitreTechnique } from '@crczp/training-model';

export type MitreTechniquesLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

/**
 * Holds the MITRE technique index offered by technique pickers, fetched on demand.
 */
export abstract class MitreTechniquesService {
    abstract readonly techniques: Signal<MitreTechnique[]>;
    abstract readonly loadState: Signal<MitreTechniquesLoadState>;

    /**
     * Fetches the index unless it is loaded or being loaded; calling it again after a failure retries.
     */
    abstract load(): void;
}
