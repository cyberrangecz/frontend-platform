import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TrainingDefinition} from '@crczp/training-model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {AdaptiveDefinitionPhasesDetailComponent} from "./phases/adaptive-definition-phases.component";
import {AdaptiveDefinitionInfoComponent} from "./info/adaptive-definition-info.component";
import {MatCard, MatCardContent} from "@angular/material/card";
import {AsyncPipe} from "@angular/common";

@Component({
    selector: 'crczp-adaptive-definition-summary',
    templateUrl: './adaptive-definition-summary.component.html',
    styleUrls: ['./adaptive-definition-summary.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AdaptiveDefinitionPhasesDetailComponent,
        AdaptiveDefinitionInfoComponent,
        MatCardContent,
        MatCard,
        AsyncPipe
    ]
})
export class AdaptiveDefinitionSummaryComponent implements OnInit {
    adaptiveDefinition$: Observable<TrainingDefinition>;
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.activeRoute.data.pipe(map((data) => data[TrainingDefinition.name]));
        this.adaptiveDefinition$ = this.activeRoute.data.pipe(
            map((data) => data[TrainingDefinition.name]),
        );
    }
}
