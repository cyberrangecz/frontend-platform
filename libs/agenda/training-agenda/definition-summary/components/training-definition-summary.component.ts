import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TRAINING_DEFINITION_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {TrainingDefinition} from '@crczp/training-model';
import {async, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
    selector: 'crczp-training-definition-summary',
    templateUrl: './training-definition-summary.component.html',
    styleUrls: ['./training-definition-summary.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingDefinitionSummaryComponent implements OnInit {
    trainingDefinition$: Observable<TrainingDefinition>;

    constructor(private activeRoute: ActivatedRoute) {
    }

    ngOnInit(): void {
        this.trainingDefinition$ = this.activeRoute.data.pipe(
            map((data) => data[TRAINING_DEFINITION_DATA_ATTRIBUTE_NAME]),
        );
    }

    protected readonly async = async;
}
