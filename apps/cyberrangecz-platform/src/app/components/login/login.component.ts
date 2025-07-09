import {Component} from '@angular/core';
import {MatCard, MatCardContent, MatCardSubtitle, MatCardTitle} from "@angular/material/card";
import {SentinelAuthProviderListComponent} from "@sentinel/auth/components";

@Component({
    selector: 'crczp-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    imports: [
        MatCardSubtitle,
        MatCardTitle,
        MatCard,
        SentinelAuthProviderListComponent,
        MatCardContent
    ]
})
export class LoginComponent {
}
