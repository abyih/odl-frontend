import apiClient from './client';
import type { NodesResponse, InventoryNode } from '@/types/odl';

export async function getNodes(): Promise<NodesResponse> {
  const { data } = await apiClient.get<NodesResponse>(
    '/rests/data/opendaylight-inventory:nodes?content=nonconfig'
  );
  return data;
}

export async function getNode(nodeId: string): Promise<InventoryNode> {
  const { data } = await apiClient.get(
    `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}?content=nonconfig`
  );
  // ODL wraps single nodes in an array
  const node = data?.node?.[0] || data?.['opendaylight-inventory:node']?.[0] || data;
  return node;
}

export async function getNodeConnectors(nodeId: string): Promise<InventoryNode> {
  const { data } = await apiClient.get(
    `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}?content=nonconfig`
  );
  const node = data?.node?.[0] || data?.['opendaylight-inventory:node']?.[0] || data;
  return node;
}
