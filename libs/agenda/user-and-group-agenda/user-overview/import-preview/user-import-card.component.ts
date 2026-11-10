import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** The fields of one user in an import file that the import card shows. */
export interface UserImportSummary {
    sub: string;
    issuer: string;
    fullName: string | null;
}

/** Shows the name, subject and issuer of one user to import. */
@Component({
    selector: 'crczp-user-import-card',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './user-import-card.component.html',
    styleUrl: './user-import-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserImportCardComponent {
    readonly entity = input.required<UserImportSummary>();
}
