import {RequestDetailComponent} from './shared/request-detail.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {RequestStagesService} from '../services/state/request-stages.service';
import {CleanupStagesConcreteService} from '../services/state/cleanup-stages-concrete.service';
import {ActivatedRoute} from '@angular/router';
import {RequestStageComponent} from "./stage/request-stage.component";
import {MatIcon} from "@angular/material/icon";
import {MatCard} from "@angular/material/card";
import {MatIconButton} from "@angular/material/button";
import {async} from "rxjs";

@Component({
    selector: 'crczp-cleanup-request-detail',
    templateUrl: './shared/request-detail.component.html',
    styleUrls: ['./shared/request-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{provide: RequestStagesService, useClass: CleanupStagesConcreteService}],
    imports: [
        RequestStageComponent,
        MatIcon,
        MatCard,
        MatIconButton
    ]
})
export class CleanupRequestDetailComponent extends RequestDetailComponent {
    protected activeRoute: ActivatedRoute;
    protected requestStagesService: RequestStagesService;

    constructor() {
        const activeRoute = inject(ActivatedRoute);
        const requestStagesService = inject(RequestStagesService);

        super(activeRoute, requestStagesService);
    
        this.activeRoute = activeRoute;
        this.requestStagesService = requestStagesService;
    }

    protected readonly async = async;
}
