import { computed, DestroyRef, inject, Injectable, Provider, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { fromEvent } from 'rxjs';

export abstract class DashboardPauseGate {
    abstract readonly paused: Signal<boolean>;
    abstract pauseAll(): void;
    abstract resumeAll(): void;
}

@Injectable()
export class DefaultDashboardPauseGate extends DashboardPauseGate {
    private readonly manualPaused = signal(false);
    private readonly documentHidden = signal(false);

    readonly paused = computed(() => this.manualPaused() || this.documentHidden());

    constructor() {
        super();
        const document = inject(DOCUMENT);
        this.documentHidden.set(document.visibilityState === 'hidden');

        fromEvent(document, 'visibilitychange')
            .pipe(takeUntilDestroyed(inject(DestroyRef)))
            .subscribe(() => {
                this.documentHidden.set(document.visibilityState === 'hidden');
            });
    }

    pauseAll(): void {
        this.manualPaused.set(true);
    }

    resumeAll(): void {
        this.manualPaused.set(false);
    }
}

export function providePauseGate(): Provider[] {
    return [{ provide: DashboardPauseGate, useClass: DefaultDashboardPauseGate }];
}
