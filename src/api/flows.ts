import apiClient from './client';
import type { Flow, FlowTable } from '@/types/odl';

export async function getFlowTables(nodeId: string): Promise<FlowTable[]> {
  const { data } = await apiClient.get(
    `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}?content=nonconfig`
  );
  const node = data?.node?.[0] || data?.['opendaylight-inventory:node']?.[0] || data;
  return node?.['flow-node-inventory:table'] || node?.table || [];
}

export async function getFlows(nodeId: string, tableId: number): Promise<Flow[]> {
  const { data } = await apiClient.get(
    `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:table=${tableId}?content=nonconfig`
  );
  const table = data?.['flow-node-inventory:table']?.[0] || data?.table?.[0] || data;
  return table?.flow || table?.['flow-node-inventory:flow'] || [];
}

export async function addFlow(
  nodeId: string,
  tableId: number,
  flowId: string,
  flowData: Partial<Flow>
): Promise<void> {
  await apiClient.put(
    `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:table=${tableId}/flow=${encodeURIComponent(flowId)}`,
    {
      'flow-node-inventory:flow': [{
        id: flowId,
        "table_id": tableId,
        ...flowData,
      }],
    }
  );
}

export async function deleteFlow(
  nodeId: string,
  tableId: number,
  flowId: string
): Promise<void> {
  await apiClient.delete(
    `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:table=${tableId}/flow=${encodeURIComponent(flowId)}`
  );
}

export async function getFlowStatistics(
  nodeId: string,
  tableId: number
): Promise<FlowTable | null> {
  try {
    const { data } = await apiClient.get(
      `/rests/data/opendaylight-inventory:nodes/node=${encodeURIComponent(nodeId)}/flow-node-inventory:table=${tableId}?content=nonconfig`
    );
    return data?.['flow-node-inventory:table']?.[0] || data?.table?.[0] || data || null;
  } catch {
    return null;
  }
}
