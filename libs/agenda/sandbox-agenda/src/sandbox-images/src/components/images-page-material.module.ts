import { NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

/**
 * Material components import for create sandbox images module
 */
@NgModule({
    imports: [MatCardModule, MatCheckboxModule],
    exports: [MatCardModule, MatCheckboxModule],
})
export class ImagesPageMaterialModule {}
