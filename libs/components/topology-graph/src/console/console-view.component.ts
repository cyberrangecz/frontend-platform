import {
    Component,
    ElementRef,
    Input,
    OnDestroy,
    OnInit,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Guacamole from 'guacamole-common-js';

@Component({
    selector: 'crczp-console-view',
    imports: [CommonModule],
    templateUrl: './console-view.component.html',
    styleUrl: './console-view.component.scss',
})
export class ConsoleView implements OnInit, OnDestroy {
    @Input({ required: true }) sandboxUUID: string;
    @Input({ required: true }) machineIP: string;

    @ViewChild('guacContainer', { static: true })
    guacContainer!: ElementRef;
    private guacClient: Guacamole.Client | null = null;

    /**
     * Lifecycle hook: Called once, after the component is initialized.
     * Initiates the Guacamole session.
     */
    ngOnInit(): void {
        this.connectGuacamole();
    }

    /**
     * Lifecycle hook: Called once, before the component is destroyed.
     * Ensures the Guacamole client is disconnected to prevent memory leaks.
     */
    ngOnDestroy(): void {
        if (this.guacClient) {
            console.log('Disconnecting Guacamole client...');
            this.guacClient.disconnect();
            this.guacClient = null;
        }
    }

    /**
     * Connects to the Guacamole server using the provided authentication token.
     * @param authToken The authentication token obtained from the server.
     * @returns An Observable that completes when the connection attempt is made.
     */
    private connectGuacamole() {
        const tunnel = new Guacamole.WebSocketTunnel(
            '/guacamole/websocket-tunnel'
        );
        this.guacClient = new Guacamole.Client(tunnel);

        const keyboard = new Guacamole.Keyboard(document);
        keyboard.onkeydown = (keysym: number) => {
            this.guacClient?.sendKeyEvent(1, keysym);
        };
        keyboard.onkeyup = (keysym: number) => {
            this.guacClient?.sendKeyEvent(0, keysym);
        };

        const display = this.guacClient.getDisplay().getElement();
        this.guacContainer.nativeElement.appendChild(display);

        this.guacClient.onstatechange = (state) => {
            console.log('Guacamole client state changed:', state);
        };

        this.guacClient.onerror = (error) => {
            console.error('Guacamole client error:', error);
        };

        const connectParams = '';

        this.guacClient.connect(connectParams);
    }
}
