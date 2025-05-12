import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Material components imports for cheating detection overview
 */
@NgModule({
    imports: [MatRippleModule, MatTooltipModule, MatIconModule],
    exports: [MatRippleModule, MatTooltipModule, MatIconModule],
})
export class CheatingDetectionOverviewMaterialModule {}
