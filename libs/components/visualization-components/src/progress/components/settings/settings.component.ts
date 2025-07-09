import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,} from '@angular/core';
import {MatCardModule} from '@angular/material/card';

import {MatIconModule} from '@angular/material/icon';
import {MatSliderModule} from '@angular/material/slider';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {DateUtils} from '@crczp/common';
import {MatButtonModule} from '@angular/material/button';

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
        MatButtonModule
    ],
})
export class HurdlingConfigComponent implements OnChanges {
    @Input() maximumTime = 100;
    @Input() timelineStepSize = 10;
    @Output() scaleRestrictionEvent = new EventEmitter<any>();
    @Output() restrictByTrainees = new EventEmitter<boolean>();
    @Output() restrictToTimeline = new EventEmitter<boolean>();

    public customRestrictedXScale = {
        min: 0,
        max: 100,
        minRestriction: 0,
        maxRestriction: 0,
    };
    public panelOpenState = false;
    public restrictToCustomTimelines = false;
    public restrictToVisibleTrainees = false;

    formatTime(seconds: number) {
        return DateUtils.formatDurationSimple(seconds);
    }

    restrictTrainees() {
        this.restrictToVisibleTrainees = !this.restrictToVisibleTrainees;
        this.restrictByTrainees.emit(this.restrictToVisibleTrainees);
    }

    restrictCustom() {
        this.restrictToCustomTimelines = !this.restrictToCustomTimelines;
        this.restrictToTimeline.emit(this.restrictToCustomTimelines);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['maximumTime']) {
            this.customRestrictedXScale.max = this.maximumTime;
        }
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
                    (this.customRestrictedXScale.max - value).toFixed()
                );
                break;
        }
        this.customRestrictedXScale[type + 'Restriction'] = restriction.value;
        this.scaleRestrictionEvent.emit(restriction);
    }
}
