/**
 * Class representing sandbox pool
 */
import {CreatedBy} from './created-by';
import {HardwareUsage} from './hardware-usage';
import {SandboxDefinition} from '../definition/sandbox-definition';

export class Pool {
    private _lockId!: number;
    private _usedSize!: number;
    private _maxSize!: number;

    id!: number;
    comment?: string;
    definition!: SandboxDefinition;
    lockState!: 'locked' | 'unlocked';
    usedAndMaxSize!: string;
    visible = true;
    notifyBuild!: boolean;
    hardwareUsage!: HardwareUsage;
    createdBy!: CreatedBy;

    get maxSize(): number {
        return this._maxSize;
    }

    set maxSize(value: number) {
        this._maxSize = value;
        this.usedAndMaxSize = `${this.usedSize}/${this.maxSize}`;
    }

    get usedSize(): number {
        return this._usedSize;
    }

    set usedSize(value: number) {
        this._usedSize = value;
        this.usedAndMaxSize = `${this.usedSize}/${this.maxSize}`;
    }

    get lockId(): number {
        return this._lockId;
    }

    set lockId(value: number) {
        this._lockId = value;
        this.lockState = this.isLocked() ? 'locked' : 'unlocked';
    }

    isFull(): boolean {
        return this._usedSize === this._maxSize;
    }

    isLocked(): boolean {
        return this._lockId !== undefined && this._lockId !== null;
    }

    isEmpty(): boolean {
        return this._usedSize === 0;
    }
}
