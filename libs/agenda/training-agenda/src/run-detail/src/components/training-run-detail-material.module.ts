import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';

/**
 * Material component imports for training run detail module
 */
@NgModule({
    imports: [MatStepperModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule],
    exports: [MatStepperModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule],
})
export class TrainingRunDetailMaterialModule {}
