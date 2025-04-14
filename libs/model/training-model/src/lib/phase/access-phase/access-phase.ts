import { Phase } from '../phase';

export class AccessPhase extends Phase {
    passkey!: string;
    cloudContent!: string;
    localContent!: string;
}
