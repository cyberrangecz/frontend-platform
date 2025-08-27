import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SentinelLayout1Component } from '@sentinel/layout/layout1';
import { AccessLevelComponent } from './sandbox-interaction-level/access-level/access-level.component';
import { AbstractLevelTypeEnum, AccessLevel } from '@crczp/training-model';

@Component({
    selector: 'crczp-run-example',
    imports: [
        SentinelLayout1Component,
        FormsModule,
        CommonModule,
        AccessLevelComponent,
    ],
    templateUrl: './run-example.html',
    styleUrl: './run-example.scss',
})
export class RunExample {
    accessLevel: AccessLevel = {
        valid: true,
        id: 0,
        estimatedDuration: 10,
        isUnsaved: false,
        localContent: 'No local content',
        cloudContent: `
Nullam rhoncus neque leo, ut semper quam suscipit sed. Pellentesque laoreet tellus ligula, eget dapibus sapien vulputate posuere. Praesent pulvinar massa nisl, id volutpat nisi finibus id. Nulla posuere ac felis vitae gravida. Suspendisse commodo vulputate posuere. Cras dignissim id odio a vestibulum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse eget nisl quam. Nulla leo ligula, ultricies eget ipsum ut, congue tempus dolor. Etiam blandit eros est, id tincidunt risus tincidunt in.

Morbi mollis enim nec blandit egestas. Suspendisse hendrerit metus vitae lacus laoreet, vel ultricies dui consequat. Proin vehicula pretium ex, sed elementum orci pharetra eget. Aliquam turpis orci, ullamcorper vitae dui sed, fermentum fringilla nibh. Mauris sit amet pulvinar massa. Phasellus non sem imperdiet, hendrerit sem a, porta metus. Quisque ut velit id enim blandit viverra. Aenean nibh purus, molestie at bibendum ut, dignissim in nulla. Fusce scelerisque mattis erat, vehicula pellentesque magna tincidunt ac. Pellentesque ullamcorper, tortor at laoreet finibus, metus neque posuere metus, gravida fringilla velit lacus vel neque. Nunc ac eleifend nulla. Aliquam vel turpis ex. Mauris placerat auctor augue. Phasellus sit amet venenatis odio.

Sed aliquam fermentum ex, non convallis diam aliquam ac. In id libero volutpat lacus varius tincidunt. Integer commodo auctor eros ac iaculis. Pellentesque et purus malesuada orci rutrum luctus a quis enim. Phasellus rhoncus tortor quam, ut cursus ligula molestie ut. Fusce vestibulum ante magna, et feugiat velit pellentesque non. Sed nunc est, mollis sed velit at, convallis pellentesque quam.
        `,
        maxScore: 10,
        minimalPossibleSolveTime: 0,
        order: 0,
        passkey: 'start',
        title: 'Titeeel',
        type: AbstractLevelTypeEnum.Access,
    };
}
