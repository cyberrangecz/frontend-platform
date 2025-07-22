import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TrainingDefinition} from '@crczp/training-model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {AsyncPipe} from "@angular/common";
import {MatCard, MatCardContent} from "@angular/material/card";
import {TrainingDefinitionInfoComponent} from "./info/training-definition-info.component";
import {TrainingDefinitionLevelsDetailComponent} from "./levels/training-definition-levels.component";

@Component({
    selector: 'crczp-training-definition-summary',
    templateUrl: './training-definition-summary.component.html',
    styleUrls: ['./training-definition-summary.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        MatCard,
        MatCardContent,
        TrainingDefinitionInfoComponent,
        TrainingDefinitionLevelsDetailComponent
    ]
})
export class TrainingDefinitionSummaryComponent implements OnInit {
    trainingDefinition$: Observable<TrainingDefinition>;
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.trainingDefinition$ = this.activeRoute.data.pipe(
            map((data) => data[TrainingDefinition.name]),
        );
    }
}
