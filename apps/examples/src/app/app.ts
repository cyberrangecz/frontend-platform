import { Component } from '@angular/core';
import { SentinelLayout1Component } from '@sentinel/layout/layout1';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'crczp-root',
    templateUrl: './app.html',
    styleUrl: './app.scss',
    imports: [SentinelLayout1Component, RouterOutlet],
})
export class App {
    protected title = 'examples';
}
