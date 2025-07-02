import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {async, Observable, take} from 'rxjs';
import {MitreTechniquesOverviewService} from '../services/mitre-techniques.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

/**
 * Smart component of mitre techniques
 */
@Component({
    selector: 'crczp-mitre-techniques',
    templateUrl: './mitre-techniques.component.html',
    styleUrls: ['./mitre-techniques.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MitreTechniquesComponent implements OnInit {
    private mitreTechniquesOverviewService = inject(MitreTechniquesOverviewService);
    private activeRoute = inject(ActivatedRoute);

    mitreTableHtml$: Observable<string>;
    showSwitch: boolean;
    played: boolean;

    constructor() {
        this.activeRoute.data.pipe(takeUntilDestroyed()).subscribe((data) => {
            this.showSwitch = data.showSwitch;
            this.played = data.showSwitch;
        });
        this.mitreTableHtml$ = this.mitreTechniquesOverviewService.resource$;
    }

    ngOnInit(): void {
        this.loadData();
    }

    switchToggled() {
        this.played = !this.played;
        this.loadData();
    }

    loadData(): void {
        this.mitreTechniquesOverviewService.getMitreTechniques(this.played).pipe(take(1)).subscribe();
    }

    protected readonly async = async;
}
