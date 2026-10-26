import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MitreTechniquesApi } from '@crczp/training-api';
import { MitreTechnique } from '@crczp/training-model';
import {
    MitreTechniquesLoadState,
    MitreTechniquesService,
} from './mitre-techniques.service';

@Injectable()
export class MitreTechniquesConcreteService extends MitreTechniquesService {
    private readonly api = inject(MitreTechniquesApi);
    private readonly destroyRef = inject(DestroyRef);

    private readonly techniquesState = signal<MitreTechnique[]>([]);
    private readonly loadStateState = signal<MitreTechniquesLoadState>('idle');

    readonly techniques = this.techniquesState.asReadonly();
    readonly loadState = this.loadStateState.asReadonly();

    load(): void {
        if (this.loadState() === 'loading' || this.loadState() === 'loaded') {
            return;
        }
        this.loadStateState.set('loading');
        this.api
            .getMitreTechniquesList()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (techniques) => {
                    this.techniquesState.set(techniques);
                    this.loadStateState.set('loaded');
                },
                error: () => this.loadStateState.set('failed'),
            });
    }
}
