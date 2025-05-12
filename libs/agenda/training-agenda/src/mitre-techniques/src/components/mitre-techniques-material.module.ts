import { NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

/**
 * Material components for training definiton mitre techniques module
 */
@NgModule({
    imports: [MatExpansionModule, MatCardModule, MatSlideToggleModule],
    exports: [MatExpansionModule, MatCardModule, MatSlideToggleModule],
})
export class MitreTechniquesMaterialModule {}
