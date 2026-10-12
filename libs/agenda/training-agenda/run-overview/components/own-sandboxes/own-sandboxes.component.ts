import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import {
    MatCard,
    MatCardContent,
    MatCardSubtitle,
    MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TraineeSandbox, TraineeSandboxStateEnum } from '@crczp/training-model';

/**
 * Lists the sandboxes the trainee allocated for themselves and lets them remove one
 */
@Component({
    selector: 'crczp-own-sandboxes',
    templateUrl: './own-sandboxes.component.html',
    styleUrls: ['./own-sandboxes.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatCardTitle,
        MatCardSubtitle,
        MatCardContent,
        MatIcon,
        MatIconButton,
        MatTooltip,
    ],
})
export class OwnSandboxesComponent {
    readonly sandboxes = input.required<TraineeSandbox[]>();
    readonly remove = output<TraineeSandbox>();

    protected stateLabel(sandbox: TraineeSandbox): string {
        switch (sandbox.state) {
            case TraineeSandboxStateEnum.BUILDING:
                return sandbox.allocationStages.every(
                    (stage) => stage === 'IN_QUEUE',
                )
                    ? 'Waiting to be built'
                    : `Being built, stage ${sandbox.currentStage} of ${sandbox.stageCount}`;
            case TraineeSandboxStateEnum.READY:
                return 'Ready';
            case TraineeSandboxStateEnum.BUILD_FAILED:
                return 'Building failed';
            case TraineeSandboxStateEnum.REMOVING:
                return 'Being removed';
            case TraineeSandboxStateEnum.REMOVAL_FAILED:
                return 'Removal failed';
        }
    }

    protected stateIcon(sandbox: TraineeSandbox): string {
        switch (sandbox.state) {
            case TraineeSandboxStateEnum.READY:
                return 'check_circle';
            case TraineeSandboxStateEnum.BUILD_FAILED:
            case TraineeSandboxStateEnum.REMOVAL_FAILED:
                return 'error';
            default:
                return 'hourglass_top';
        }
    }

    protected hasFailed(sandbox: TraineeSandbox): boolean {
        return (
            sandbox.state === TraineeSandboxStateEnum.BUILD_FAILED ||
            sandbox.state === TraineeSandboxStateEnum.REMOVAL_FAILED
        );
    }
}
