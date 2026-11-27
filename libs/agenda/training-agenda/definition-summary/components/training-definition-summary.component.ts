import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingDefinitionWithLevels } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { TrainingDefinitionInfoComponent } from './info/training-definition-info.component';
import { TrainingDefinitionLevelsDetailComponent } from './levels/training-definition-levels.component';
import {
    SHOWN_DEFINITION_ATTACHMENTS,
    ShownDefinitionAttachmentSource,
} from '@crczp/training-agenda/internal';

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
        TrainingDefinitionLevelsDetailComponent,
    ],
    providers: SHOWN_DEFINITION_ATTACHMENTS,
})
export class TrainingDefinitionSummaryComponent implements OnInit {
    trainingDefinition$: Observable<TrainingDefinitionWithLevels>;
    private activeRoute = inject(ActivatedRoute);
    private readonly attachments = inject(ShownDefinitionAttachmentSource);

    ngOnInit(): void {
        this.trainingDefinition$ = this.activeRoute.data.pipe(
            map((data) => data[TrainingDefinitionWithLevels.name] || null),
            tap((definition: TrainingDefinitionWithLevels | null) => this.attachments.show(definition?.id)),
        );
    }
}
