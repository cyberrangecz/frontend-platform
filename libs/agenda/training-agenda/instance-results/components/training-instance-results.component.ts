import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs';
import { LinearTrainingDefinitionApi } from '@crczp/training-api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';
import { WalkthroughService } from './walkthrough-wrapper/services/walkthrough.service';
import { TrainingInstance } from '@crczp/training-model';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'crczp-training-instance-results',
    templateUrl: './training-instance-results.component.html',
    styleUrls: ['./training-instance-results.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatTabNav,
        MatTabLink,
        RouterLink,
        RouterLinkActive,
        MatIcon,
        RouterOutlet,
        MatTabNavPanel,
    ],
    providers: [WalkthroughService],
})
export class TrainingInstanceResultsComponent implements OnInit {
    hasReferenceSolution$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private trainingDefinitionApi = inject(LinearTrainingDefinitionApi);

    ngOnInit(): void {
        this.activeRoute.data
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                filter((data) => !!data[TrainingInstance.name]),
            )
            .subscribe(
                (data) =>
                    (this.hasReferenceSolution$ =
                        this.trainingDefinitionApi.hasReferenceSolution(
                            data[TrainingInstance.name].trainingDefinition.id,
                        )),
            );
    }
}
