import { Component, input } from '@angular/core';
import { TraineeProgressData } from '@crczp/visualization-model';
import { MatIcon } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'crczp-progress-avatar',
    imports: [MatIcon, NgClass, MatTooltip],
    templateUrl: './progress-avatar.component.html',
    styleUrl: './progress-avatar.component.scss',
})
export class ProgressAvatarComponent {
    traineeInfo = input.required<TraineeProgressData>();
    warning = input<string>(null);
}
