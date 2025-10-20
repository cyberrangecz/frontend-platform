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
import {
    GuacamoleClientState,
    GuacamoleTunnelState,
    mapGuacamoleClientState,
    mapGuacamoleTunnelState,
} from './status/guacamoleStatusMapper';
import { GuacamoleKeyCodes } from './keycodes';

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

    tunnelStateCode = signal<GuacamoleTunnelState>('INVALID');
    clientStateCode = signal<GuacamoleClientState>('INVALID');

    private readonly authService = inject(OAuthService);
    private guacClient: Guacamole.Client | null = null;
    private guacMouse: Guacamole.Mouse | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private listeners: (() => void)[] = [];
    private clipboardInterval: number | null = null;
    private lastClipboardContent = '';

    ngOnInit(): void {
        this.connectGuacamole();
        this.setupResizeObserver();
        this.setupClipboardSync();
    }

    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.clipboardInterval) {
            clearInterval(this.clipboardInterval);
            this.clipboardInterval = null;
        }

        if (this.guacClient) {
            console.log('Disconnecting Guacamole client...');
            this.guacClient.disconnect();
            this.guacClient = null;
        }

        for (const remove of this.listeners) remove();
        this.listeners = [];
    }

    getCursorStyle(): CSSStyleDeclaration['cursor'] {
        switch (this.clientStateCode()) {
            case 'CONNECTED':
                return undefined;
            case 'CONNECTING':
                return 'wait';
            case 'DISCONNECTED':
            case 'DISCONNECTING':
            case 'INVALID':
                return 'not-allowed';
            case 'WAITING':
                return 'progress';
            default:
                return undefined;
        }
    }

    private get_keysym(
        keysyms: number[] | null,
        location: number,
    ): number | null {
        if (!keysyms) return null;
        return keysyms[location] || keysyms[0];
    }

    private keysym_from_keycode(
        keyCode: number,
        location: number,
    ): number | null {
        return this.get_keysym(
            GuacamoleKeyCodes.keycodeKeysyms[keyCode],
            location,
        );
    }

    private keysym_from_key_identifier(
        identifier: string,
        location: number,
    ): number | null {
        if (!identifier) return null;
        if (identifier.length === 1) {
            return identifier.charCodeAt(0);
        }
        return this.get_keysym(
            GuacamoleKeyCodes.keyidentifier_keysym[identifier],
            location,
        );
    }

    private setupClipboardSync(): void {
        // Poll browser clipboard every 500ms to detect changes
        this.clipboardInterval = window.setInterval(async () => {
            if (!this.guacClient || this.clientStateCode() !== 'CONNECTED') {
                return;
            }

            try {
                const clipboardText = await navigator.clipboard.readText();
                if (clipboardText !== this.lastClipboardContent) {
                    this.lastClipboardContent = clipboardText;
                    this.sendClipboardToRemote(clipboardText);
                }
            } catch (_error) {
                // Clipboard access denied or not available - this is normal
                // when the tab is not focused
            }
        }, 500);
    }

    private sendClipboardToRemote(text: string): void {
        if (!this.guacClient) return;

        const stream = this.guacClient.createClipboardStream(
            'text/plain',
            'clipboard',
        );
        const writer = new Guacamole.StringWriter(stream);
        writer.sendText(text);
        writer.sendEnd();
    }

    private setupClipboardReceiver(): void {
        if (!this.guacClient) return;

        this.guacClient.onclipboard = (
            stream: Guacamole.InputStream,
            mimetype: string,
        ) => {
            if (mimetype !== 'text/plain') {
                return;
            }

            let clipboardContent = '';
            const reader = new Guacamole.StringReader(stream);

            reader.ontext = (text: string) => {
                clipboardContent += text;
            };

            reader.onend = async () => {
                try {
                    await navigator.clipboard.writeText(clipboardContent);
                    this.lastClipboardContent = clipboardContent;
                } catch (error) {
                    console.error('Failed to write to clipboard:', error);
                }
            };
        };
    }

    private setupResizeObserver(): void {
        this.resizeObserver = new ResizeObserver(() => {
            this.handleResize();
        });

        this.resizeObserver.observe(this.guacContainer.nativeElement);
    }

    private handleResize(): void {
        if (!this.guacClient) return;

        const container: HTMLDivElement = this.guacContainer.nativeElement;
        const width = container.offsetWidth;
        const height = container.offsetHeight;

        if (width > 0 && height > 0) {
            this.guacClient.sendSize(width, height);
        }
    }

    private connectGuacamole() {
        const tunnel = new Guacamole.WebSocketTunnel(
            'wss://devel.platform.cyberrange.cz/guacamole/api/v1/websocket/guacamole',
        );

        // Add tunnel error handler BEFORE creating client
        tunnel.onerror = (error) => {
            console.error('Tunnel error:', error);
        };

        tunnel.onstatechange = (state: number) =>
            this.tunnelStateCode.set(mapGuacamoleTunnelState(state));

        this.guacClient = new Guacamole.Client(tunnel);

        // Setup clipboard receiver
        this.setupClipboardReceiver();

        const keydownHandler = (e: KeyboardEvent) => {
            e.preventDefault();
            const keysym =
                this.keysym_from_key_identifier(e.key, e.location) ||
                this.keysym_from_keycode(e.keyCode, e.location);
            if (keysym !== null) {
                this.guacClient?.sendKeyEvent(1, keysym);
            }
        };
        const keyupHandler = (e: KeyboardEvent) => {
            e.preventDefault();
            const keysym =
                this.keysym_from_key_identifier(e.key, e.location) ||
                this.keysym_from_keycode(e.keyCode, e.location);
            if (keysym !== null) {
                this.guacClient?.sendKeyEvent(0, keysym);
            }
        };
        document.addEventListener('keydown', keydownHandler, {
            passive: false,
        });
        document.addEventListener('keyup', keyupHandler, { passive: false });
        this.listeners.push(() =>
            document.removeEventListener('keydown', keydownHandler),
        );
        this.listeners.push(() =>
            document.removeEventListener('keyup', keyupHandler),
        );

        // Setup mouse with full event handling (movement, clicks, scrolling)
        this.guacMouse = new Guacamole.Mouse(this.guacContainer.nativeElement);

        this.guacMouse.onmousedown =
            this.guacMouse.onmouseup =
            this.guacMouse.onmousemove =
                (mouseState) => {
                    this.guacClient?.sendMouseState(mouseState);
                };

        this.guacClient.onstatechange = (state: number) => {
            this.clientStateCode.set(mapGuacamoleClientState(state));
            if (this.clientStateCode() === 'CONNECTED') {
                this.handleResize();
                // Force display refresh for VNC
                const display = this.guacClient?.getDisplay();
                if (display) {
                    display.showCursor(true);
                }
            }
        };

        this.guacClient.onerror = (error) => {
            console.error('Guacamole client error:', error);
        };

        const display = this.guacClient.getDisplay();
        const displayElement = display.getElement();

        // Critical for VNC: proper canvas configuration
        displayElement.style.display = 'block';
        displayElement.style.margin = '0';
        displayElement.style.padding = '0';
        displayElement.style.width = '100%';
        displayElement.style.height = '100%';

        this.guacContainer.nativeElement.appendChild(displayElement);

        console.log(
            'Connecting to Guacamole with params:',
            this.buildConnectionParams(),
        );
        this.guacClient.connect(this.buildConnectionParams());
    }

    private buildConnectionParams(): string {
        let params = '';

        const appendParam = (key: string, value: string) => {
            params += `${encodeURIComponent(key)}=${encodeURIComponent(
                value,
            )}&`;
        };

        appendParam('authToken', this.authService.getAccessToken() || '');
        appendParam('sandboxUuid', this.connectionParams().sandboxUuid);
        appendParam('nodeName', this.connectionParams().nodeName);
        appendParam(
            'withGui',
            this.connectionParams().withGui ? 'true' : 'false',
        );
        return params;
    }
}
