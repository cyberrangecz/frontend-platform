import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable, take} from 'rxjs';
import {MitreTechniquesOverviewService} from '../services/mitre-techniques.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MitreTechniquesOverviewConcreteService} from "../services/mitre-techniques-concrete.service";
import {AsyncPipe} from "@angular/common";
import {MatCard} from "@angular/material/card";
import {MatSlideToggle} from "@angular/material/slide-toggle";
import {SafeHtmlPipe} from "./safe-html.pipe";

/**
 * Smart component of mitre techniques
 */
@Component({
    selector: 'crczp-mitre-techniques',
    templateUrl: './mitre-techniques.component.html',
    styleUrls: ['./mitre-techniques.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{provide: MitreTechniquesOverviewService, useClass: MitreTechniquesOverviewConcreteService}],
    imports: [
        AsyncPipe,
        MatCard,
        MatSlideToggle,
        SafeHtmlPipe
    ]
})
export class MitreTechniquesComponent implements OnInit {
    mitreTableHtml$: Observable<string>;
    showSwitch: boolean;
    played: boolean;
    private mitreTechniquesOverviewService = inject(MitreTechniquesOverviewService);
    private activeRoute = inject(ActivatedRoute);

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
}
