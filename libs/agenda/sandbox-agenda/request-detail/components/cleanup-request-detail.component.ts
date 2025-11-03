import { RequestDetailComponent } from './shared/request-detail.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RequestStagesService } from '../services/state/request-stages.service';
import { CleanupStagesConcreteService } from '../services/state/cleanup-stages-concrete.service';
import { RequestStageComponent } from './stage/request-stage.component';
import { MatIcon } from '@angular/material/icon';
import { MatCard } from '@angular/material/card';
import { MatIconButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'crczp-cleanup-request-detail',
    templateUrl: './shared/request-detail.component.html',
    styleUrls: ['./shared/request-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: RequestStagesService,
            useClass: CleanupStagesConcreteService,
        },
    ],
    imports: [
        RequestStageComponent,
        MatIcon,
        MatCard,
        MatIconButton,
        AsyncPipe,
    ],
})
export class CleanupRequestDetailComponent extends RequestDetailComponent {
    constructor() {
        super();
    }
}
