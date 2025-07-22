import {Component} from '@angular/core';
import {RouterOutlet} from "@angular/router";

@Component({
    selector: 'crczp-root',
    templateUrl: './app.html',
    styleUrl: './app.scss',
    imports: [
        RouterOutlet,
    ]
})
export class App {
    protected title = 'examples';
}
