import { HostNode, RouterNode, Subnet } from '@crczp/sandbox-model';
import { Node } from 'vis-network';

export type GraphNodeType = 'INTERNET' | 'ROUTER' | 'HOST' | 'SUBNET';

export type OsType = 'WINDOWS' | 'LINUX';

export type TopologyGraphNode = Node &
    (
        | {
              nodeType: 'INTERNET';
              name: 'Internet';
          }
        | {
              nodeType: 'ROUTER';
              osType: OsType;
              guiAccess: boolean;
              subnets: Subnet[];
          }
        | {
              nodeType: 'HOST';
              ip: string;
              osType: OsType;
              guiAccess: boolean;
              subnet: Subnet;
          }
        | {
              nodeType: 'SUBNET';
              cidr: string;
              router: RouterNode;
              hosts: HostNode[];
              expandedUri: string;
              collapsedUri: string;
          }
    );
