/**
 * Class representing sandbox instance
 */
export class SandboxInstance {
    id!: string;
    allocationUnitId!: number;
    lockState!: string;

    private _lockId!: number;

    get lockId(): number {
        return this._lockId;
    }

    set lockId(value: number) {
        this._lockId = value;
        this.lockState = this.isLocked() ? 'locked' : 'unlocked';
    }

    isLocked(): boolean {
        return this._lockId !== undefined && this._lockId !== null;
    }
}
