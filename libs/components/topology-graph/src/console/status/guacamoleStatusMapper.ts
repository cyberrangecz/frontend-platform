export type GuacamoleTunnelState =
    | 'CONNECTING'
    | 'OPEN'
    | 'CLOSED'
    | 'UNSTABLE'
    | 'INVALID';

// Relates 1:1 to Guacamole.Tunnel.State
const TUNNEL_STATES_MAPPING: GuacamoleTunnelState[] = [
    /**
     * A connection is in pending. It is not yet known whether connection was
     * successful.
     *
     * @type {!number}
     */
    'CONNECTING',

    /**
     * Connection was successful, and data is being received.
     *
     * @type {!number}
     */
    'OPEN',

    /**
     * The connection is closed. Connection may not have been successful, the
     * tunnel may have been explicitly closed by either side, or an error may
     * have occurred.
     *
     * @type {!number}
     */
    'CLOSED',

    /**
     * The connection is open, but communication through the tunnel appears to
     * be disrupted, and the connection may close as a result.
     *
     * @type {!number}
     */
    'UNSTABLE',
];

export function mapGuacamoleTunnelState(state: number): GuacamoleTunnelState {
    return TUNNEL_STATES_MAPPING[state] || 'INVALID';
}

export type GuacamoleClientState =
    | 'IDLE'
    | 'CONNECTING'
    | 'WAITING'
    | 'CONNECTED'
    | 'DISCONNECTING'
    | 'DISCONNECTED'
    | 'INVALID';

// Relates 1:1 to Guacamole.Client.State
export const GUACAMOLE_CLIENT_STATES: GuacamoleClientState[] = [
    /**
     * The client is idle, with no active connection.
     *
     * @type number
     */
    'IDLE',

    /**
     * The client is in the process of establishing a connection.
     *
     * @type {!number}
     */
    'CONNECTING',

    /**
     * The client is waiting on further information or a remote server to
     * establish the connection.
     *
     * @type {!number}
     */
    'WAITING',

    /**
     * The client is actively connected to a remote server.
     *
     * @type {!number}
     */
    'CONNECTED',

    /**
     * The client is in the process of disconnecting from the remote server.
     *
     * @type {!number}
     */
    'DISCONNECTING',

    /**
     * The client has completed the connection and is no longer connected.
     *
     * @type {!number}
     */
    'DISCONNECTED',
];

export function mapGuacamoleClientState(state: number): GuacamoleClientState {
    return GUACAMOLE_CLIENT_STATES[state] || 'INVALID';
}
