import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SentinelMarkdownViewComponent } from '@sentinel/components/markdown-view';
import { MatButton } from '@angular/material/button';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { InfoLevel, InfoPhase } from '@crczp/training-model';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'crczp-info-level',
    templateUrl: './info-level.component.html',
    styleUrls: ['./info-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelMarkdownViewComponent, MatButton, AsyncPipe],
})
/**
 * Component to display training run's level of type INFO. Only displays markdown and allows user to continue immediately.
 */
export class InfoLevelComponent {
    protected readonly runService = inject(AbstractTrainingRunService);

    get levelContent$(): Observable<string> {
        return this.runService.runInfo$.pipe(
            map(
                (runInfo) =>
                    (runInfo.displayedLevel as InfoLevel | InfoPhase).content,
            ),
        );
    }
}
