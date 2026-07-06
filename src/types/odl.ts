// ─── Topology Types ───────────────────────────────────────────────────────────

export interface TopologyLink {
  "link-id": string;
  source: {
    "source-node": string;
    "source-tp": string;
  };
  destination: {
    "dest-node": string;
    "dest-tp": string;
  };
}

export interface TopologyNode {
  "node-id": string;
  "termination-point"?: Array<{
    "tp-id": string;
  }>;
  "network-topology:termination-point"?: Array<{
    "tp-id": string;
  }>;
}

export interface Topology {
  "topology-id": string;
  node?: TopologyNode[];
  "network-topology:node"?: TopologyNode[];
  link?: TopologyLink[];
  "network-topology:link"?: TopologyLink[];
}

export interface TopologyResponse {
  "network-topology"?: {
    topology: Topology[];
  };
  "network-topology:network-topology"?: {
    topology: Topology[];
  };
}

// ─── Inventory / Node Types ──────────────────────────────────────────────────

export interface PortStatistics {
  "bytes": { received: number; transmitted: number };
  "packets": { received: number; transmitted: number };
  "duration": { second: number; nanosecond: number };
  "collision-count"?: number;
  "receive-crc-error"?: number;
  "receive-errors"?: number;
  "receive-frame-error"?: number;
  "receive-over-run-error"?: number;
  "receive-drops"?: number;
  "transmit-drops"?: number;
  "transmit-errors"?: number;
}

export interface NodeConnector {
  id: string;
  "flow-node-inventory:port-number"?: string;
  "flow-node-inventory:name"?: string;
  "flow-node-inventory:hardware-address"?: string;
  "flow-node-inventory:current-speed"?: number;
  "flow-node-inventory:maximum-speed"?: number;
  "flow-node-inventory:state"?: {
    blocked: boolean;
    "link-down": boolean;
    live: boolean;
  };
  "opendaylight-port-statistics:flow-capable-node-connector-statistics"?: PortStatistics;
}

export interface FlowCapableNodeInfo {
  manufacturer?: string;
  hardware?: string;
  software?: string;
  "serial-number"?: string;
  description?: string;
  "ip-address"?: string;
}

export interface InventoryNode {
  id: string;
  "node-connector"?: NodeConnector[];
  "opendaylight-inventory:node-connector"?: NodeConnector[];
  "flow-node-inventory:manufacturer"?: string;
  "flow-node-inventory:hardware"?: string;
  "flow-node-inventory:software"?: string;
  "flow-node-inventory:serial-number"?: string;
  "flow-node-inventory:description"?: string;
  "flow-node-inventory:ip-address"?: string;
  "flow-node-inventory:table"?: FlowTable[];
  table?: FlowTable[];
}

export interface NodesResponse {
  nodes?: {
    node: InventoryNode[];
  };
  "opendaylight-inventory:nodes"?: {
    node: InventoryNode[];
  };
}

// ─── Flow Types ──────────────────────────────────────────────────────────────

export interface FlowMatch {
  "in-port"?: string;
  "ethernet-match"?: {
    "ethernet-type"?: { type: number };
    "ethernet-source"?: { address: string };
    "ethernet-destination"?: { address: string };
  };
  "ipv4-source"?: string;
  "ipv4-destination"?: string;
  "ip-match"?: {
    "ip-protocol"?: number;
  };
  "tcp-source-port"?: number;
  "tcp-destination-port"?: number;
  "udp-source-port"?: number;
  "udp-destination-port"?: number;
}

export interface FlowAction {
  order: number;
  "output-action"?: {
    "output-node-connector": string;
    "max-length"?: number;
  };
  "drop-action"?: Record<string, never>;
  "set-field"?: Record<string, string>;
  "push-vlan-action"?: {
    "ethernet-type": number;
  };
  "set-vlan-id-action"?: {
    "vlan-id": number;
  };
}

export interface FlowInstruction {
  order: number;
  "apply-actions"?: {
    action: FlowAction[];
  };
  "write-actions"?: {
    action: FlowAction[];
  };
  "go-to-table"?: {
    "table_id": number;
  };
}

export interface Flow {
  id: string;
  "flow-name"?: string;
  priority: number;
  "table_id": number;
  match: FlowMatch;
  instructions?: {
    instruction: FlowInstruction[];
  };
  "opendaylight-flow-statistics:flow-statistics"?: {
    "packet-count": number;
    "byte-count": number;
    duration: { second: number; nanosecond: number };
  };
  "idle-timeout"?: number;
  "hard-timeout"?: number;
  cookie?: number;
  flags?: string;
}

export interface FlowTable {
  id: number;
  flow?: Flow[];
  "flow-node-inventory:flow"?: Flow[];
  "opendaylight-flow-table-statistics:flow-table-statistics"?: {
    "active-flows": number;
    "packets-looked-up": number;
    "packets-matched": number;
  };
}

export interface FlowTableResponse {
  "flow-node-inventory:table": FlowTable[];
}

// ─── Controller Module Types ─────────────────────────────────────────────────

export interface ControllerModule {
  name: string;
  revision: string;
  namespace: string;
}

export interface ModulesResponse {
  modules?: {
    module: ControllerModule[];
  };
  "ietf-yang-library:modules-state"?: {
    module: ControllerModule[];
  };
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  totalNodes: number;
  activeLinks: number;
  totalFlows: number;
  totalTables: number;
}

// ─── Env Config ──────────────────────────────────────────────────────────────

export interface OdlConfig {
  apiUrl: string;
  username: string;
  password: string;
  pollingInterval: number;
}
