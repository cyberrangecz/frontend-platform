import {
    Component,
    ElementRef,
    inject,
    input,
    OnDestroy,
    OnInit,
    signal,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Guacamole from 'guacamole-common-js';
import { OAuthService } from 'angular-oauth2-oidc';
import { GuacamoleStatus } from './status/guacamole-status';

export type ConnectionParams = {
    sandboxUuid: string;
    nodeName: string;
    withGui: boolean;
};

@Component({
    selector: 'crczp-console-view',
    imports: [CommonModule, GuacamoleStatus],
    templateUrl: './console-view.component.html',
    styleUrl: './console-view.component.scss',
})
export class ConsoleView implements OnInit, OnDestroy {
    @ViewChild('guacContainer', { static: true })
    guacContainer!: ElementRef;

    connectionParams = input.required<ConnectionParams>();

    tunnelStateCode = signal<number>(-1);
    clientStateCode = signal<number>(-1);

    private readonly authService = inject(OAuthService);
    private guacClient: Guacamole.Client | null = null;

    ngOnInit(): void {
        this.connectGuacamole();
    }

    ngOnDestroy(): void {
        if (this.guacClient) {
            console.log('Disconnecting Guacamole client...');
            this.guacClient.disconnect();
            this.guacClient = null;
        }
    }

    private connectGuacamole() {
        const tunnel = new Guacamole.WebSocketTunnel(
            'wss://devel.platform.cyberrange.cz/guacamole/api/v1/websocket/guacamole'
        );

        // Add tunnel error handler BEFORE creating client
        tunnel.onerror = (error) => {
            console.error('Tunnel error:', error);
        };

        tunnel.onstatechange = (state) => this.tunnelStateCode.set(state);

        this.guacClient = new Guacamole.Client(tunnel);

        const keyboard = new Guacamole.Keyboard(document);
        keyboard.onkeydown = (keysym: number) => {
            this.guacClient?.sendKeyEvent(1, keysym);
        };
        keyboard.onkeyup = (keysym: number) => {
            this.guacClient?.sendKeyEvent(0, keysym);
        };

        this.guacClient.onstatechange = (state) =>
            this.clientStateCode.set(state);

        this.guacClient.onerror = (error) => {
            console.error('Guacamole client error:', error);
        };

        const display = this.guacClient.getDisplay().getElement();
        this.guacContainer.nativeElement.appendChild(display);

        this.guacClient.connect(this.buildConnectionParams());
    }

    private buildConnectionParams(): string {
        let params = '';

        const appendParam = (key: string, value: string) => {
            params += `${encodeURIComponent(key)}=${encodeURIComponent(
                value
            )}&`;
        };

        appendParam('authToken', this.authService.getAccessToken() || '');
        appendParam('sandboxUuid', this.connectionParams().sandboxUuid);
        appendParam('nodeName', this.connectionParams().nodeName);
        appendParam(
            'withGui',
            this.connectionParams().withGui ? 'true' : 'false'
        );
        return params;
    }
}
