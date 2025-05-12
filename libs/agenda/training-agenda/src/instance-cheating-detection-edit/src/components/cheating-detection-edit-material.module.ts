import { NgModule } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

/**
 * Material components for training instance cheating detection edit module
 */
@NgModule({
    imports: [
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatDividerModule,
        MatTooltipModule,
        MatInputModule,
        MatSlideToggleModule,
    ],
    exports: [
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatDividerModule,
        MatTooltipModule,
        MatInputModule,
        MatSlideToggleModule,
    ],
})
export class CheatingDetectionEditMaterialModule {}
