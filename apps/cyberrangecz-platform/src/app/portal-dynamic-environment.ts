import {DynamicEnvironment, SentinelConfig} from '@sentinel/common/dynamic-env';
import {PortalConfig} from "@crczp/common";

export class PortalDynamicEnvironment {
    public static getConfig(): PortalConfig {
        return DynamicEnvironment.getConfig<SentinelConfig>();
    }
}
