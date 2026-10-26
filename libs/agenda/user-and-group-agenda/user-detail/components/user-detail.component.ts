import {
  Component,
  inject,
  ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { User } from '@crczp/user-and-group-model';
import {
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'crczp-user-detail',
    templateUrl: './user-detail.component.html',
    imports: [
        MatAccordion,
        MatButton,
        MatCard,
        MatExpansionPanel,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatIcon,
        MatTooltip,
        MatExpansionPanelHeader,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./user-detail.component.css'],
})
export class UserDetailComponent {
    @ViewChild(MatAccordion) accordion: MatAccordion;
    private activeRoute = inject(ActivatedRoute);
    protected readonly currentUser = toSignal(
        this.activeRoute.data.pipe(map((data) => data[User.name] as User)),
        { requireSync: true },
    );
}
