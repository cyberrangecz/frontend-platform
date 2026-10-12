/**
 * Why a trainee whose training instance lets them allocate their own sandbox stays on the run
 * overview instead of entering the run
 */
export enum SandboxWaitReasonEnum {
    /** The run's sandbox is not ready yet */
    PREPARING = 'preparing',
    /** Building or removing the run's sandbox failed; the trainee has to remove it */
    FAILED = 'failed',
    /** The run's sandbox is being removed; entering the access token again then allocates one */
    REMOVING = 'removing',
    /** The trainee's sandbox for another training keeps them from getting one */
    BLOCKED = 'blocked',
    /** The run's sandbox is gone; entering the access token again allocates a new one */
    MISSING = 'missing',
}
