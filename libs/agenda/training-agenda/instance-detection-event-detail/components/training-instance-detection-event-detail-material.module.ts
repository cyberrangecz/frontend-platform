import { NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * Material components for training instance cheating detection edit module
 */
@NgModule({
    imports: [MatCardModule, MatIconModule],
    exports: [MatCardModule, MatIconModule],
})
export class TrainingInstanceDetectionEventDetailMaterialModule {}
