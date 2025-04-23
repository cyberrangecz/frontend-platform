/**
 * Interface of any node/device that is connectable, meaning it is possible to access it remotely
 */
export interface Connectable {
    /**
     * URL for remote access
     */
    consoleUrl: string;
}
