import { RequestDetailComponent } from '../shared/request-detail.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RequestStagesService } from '../../services/state/request-stages.service';
import { CleanupStagesConcreteService } from '../../services/state/cleanup-stages-concrete.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'crczp-cleanup-request-detail',
    templateUrl: '../shared/request-detail.component.html',
    styleUrls: ['../shared/request-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{ provide: RequestStagesService, useClass: CleanupStagesConcreteService }],
})
export class CleanupRequestDetailComponent extends RequestDetailComponent {
    constructor(
        protected activeRoute: ActivatedRoute,
        protected requestStagesService: RequestStagesService,
    ) {
        super(activeRoute, requestStagesService);
    }
}
