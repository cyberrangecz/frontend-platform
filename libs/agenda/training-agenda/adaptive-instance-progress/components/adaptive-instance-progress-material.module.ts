import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

/**
 * Material components imports for training instance progress module
 */
@NgModule({
    imports: [MatButtonModule, MatIconModule, MatTabsModule],
    exports: [MatButtonModule, MatIconModule, MatTabsModule],
})
export class AdaptiveInstanceProgressMaterialModule {}
