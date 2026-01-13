import {
    Component,
    input,
    OnChanges,
    output,
    signal,
    SimpleChanges,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Utils } from '@crczp/utils';
import { XScaleRestriction } from '../visualizations/progress/progress.component';


export type RestrictionEvent = { type: string; value: number };

@Component({
    selector: 'crczp-viz-hurdling-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css'],
    imports: [
        MatCardModule,
        MatIconModule,
        MatSliderModule,
        MatFormFieldModule,
        MatSlideToggleModule,
        MatExpansionModule,
        MatTooltipModule,
        MatInputModule,
        MatButtonModule,
    ],
})
export class HurdlingConfigComponent implements OnChanges {
    maximumTime = input<number>(100);
    timelineStepSize = input<number>(10);

    scaleRestrictionEvent = output<RestrictionEvent>();
    restrictByTrainees = output<boolean>();
    restrictToTimeline = output<boolean>();

    public customRestrictedXScale: XScaleRestriction = {
        min: 0,
        max: 100,
        minRestriction: 0,
        maxRestriction: 0,
    };

    public panelOpenState = signal<boolean>(false);
    public restrictToCustomTimelines = signal<boolean>(false);
    public restrictToVisibleTrainees = signal<boolean>(false);

    formatTime(seconds: number) {
        return Utils.Date.formatDurationSimple(seconds);
    }

    restrictTrainees() {
        this.restrictToVisibleTrainees.update((value) => !value);
        this.restrictByTrainees.emit(this.restrictToVisibleTrainees());
    }

    restrictCustom() {
        this.restrictToCustomTimelines.update((value) => !value);
        this.restrictToTimeline.emit(this.restrictToCustomTimelines());
    }

    ngOnChanges(changes: SimpleChanges) {
        console.group('settings.component - ngOnChanges');
        if (changes['maximumTime']) {
            this.customRestrictedXScale.max = this.maximumTime();
            console.log('maximumTime changed:', this.maximumTime);
        }
        if (changes['timelineStepSize']) {
            console.log('timelineStepSize changed:', this.timelineStepSize);
        }
        console.groupEnd();
    }

    updateVisibleTimeline(event: any, type: string) {
        let value: number = event;
        const restriction: { type: string; value: number } = {
            type: type,
            value: 0,
        };

        if (typeof event == 'object') {
            value = Number.parseInt(event.target.value);
        }
        switch (type) {
            case 'min':
                restriction.value = Number.parseInt(value.toFixed());
                break;
            case 'max':
                restriction.value = Number.parseInt(
                    (this.customRestrictedXScale.max - value).toFixed(),
                );
                break;
        }
        this.customRestrictedXScale[type + 'Restriction'] = restriction.value;
        this.scaleRestrictionEvent.emit(restriction);
    }
}
