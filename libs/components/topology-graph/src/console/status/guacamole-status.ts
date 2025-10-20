import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { GuacamoleClientState, GuacamoleTunnelState } from './guacamoleStatusMapper';

/**
 * Component to display the status of a Guacamole connection.
 * It takes the tunnel state and client state as inputs and displays
 * a corresponding status message and color.
 * The message is placed with absolute positioning in the top-right corner.
 */
@Component({
    selector: 'crczp-guacamole-status',
    imports: [CommonModule],
    templateUrl: './guacamole-status.html',
    styleUrl: './guacamole-status.scss',
})
export class GuacamoleStatus {
    tunnelStateCode = input.required<GuacamoleTunnelState>();
    clientStateCode = input.required<GuacamoleClientState>();

    stateColor = signal<CSSStyleDeclaration['color']>('black');
    stateText = signal<string>('Unknown');
    is_ok = signal<boolean>(false);

    constructor() {
        const tunnelStateObservable = toObservable(this.tunnelStateCode);
        const clientStateObservable = toObservable(this.clientStateCode);

        combineLatest([tunnelStateObservable, clientStateObservable]).subscribe(
            ([tunnelState, clientState]) =>
                this.updateState(tunnelState, clientState),
        );
    }

    private updateState(
        tunnelState: GuacamoleTunnelState,
        clientState: GuacamoleClientState,
    ) {
        this.is_ok.set(tunnelState === 'OPEN' && clientState === 'CONNECTED');
        console.log('tunnelState:', tunnelState, 'clientState:', clientState);
        if (tunnelState === 'OPEN') {
            switch (clientState) {
                case 'IDLE':
                    this.stateColor.set('#888');
                    this.stateText.set('Idle');
                    break;
                case 'CONNECTING':
                    this.stateColor.set('#e7dd1e');
                    this.stateText.set('Client connecting...');
                    break;
                case 'WAITING':
                    this.stateColor.set('#e7dd1e');
                    this.stateText.set('Waiting for server...');
                    break;
                case 'CONNECTED':
                    this.stateColor.set('#00c000');
                    this.stateText.set('Connected');
                    break;
                case 'DISCONNECTING':
                    this.stateColor.set('#ff8000');
                    this.stateText.set('Closing client connection...');
                    break;
                case 'DISCONNECTED':
                    this.stateColor.set('#333');
                    this.stateText.set('Disconnected');
                    break;
                default:
                    this.stateColor.set('#e336da');
                    this.stateText.set('Unknown client state');
            }
        } else {
            switch (tunnelState) {
                case 'CONNECTING':
                    this.stateColor.set('#e7dd1e');
                    this.stateText.set('Connecting tunnel...');
                    break;
                case 'UNSTABLE':
                    this.stateColor.set('#ff8000');
                    this.stateText.set('Tunnel unstable');
                    break;
                case 'CLOSED':
                    this.stateColor.set('#333');
                    this.stateText.set('Tunnel closed');
                    break;
                default:
                    this.stateColor.set('#e336da');
                    this.stateText.set('Invalid tunnel state');
                    break;
            }
        }
    }
}
