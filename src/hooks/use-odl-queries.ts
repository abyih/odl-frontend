import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTopology } from '@/api/topology';
import { getNodes, getNode } from '@/api/nodes';
import { getFlowTables, getFlows, addFlow, deleteFlow, getFlowStatistics } from '@/api/flows';
import { getControllerModules, getControllerStatus } from '@/api/controller';
import { getPollingInterval } from '@/api/client';
import type { Flow } from '@/types/odl';

const interval = getPollingInterval();

// ─── Topology ────────────────────────────────────────────────────────────────

export function useTopology() {
  return useQuery({
    queryKey: ['topology'],
    queryFn: getTopology,
    refetchInterval: interval,
    retry: 2,
  });
}

// ─── Nodes ───────────────────────────────────────────────────────────────────

export function useNodes() {
  return useQuery({
    queryKey: ['nodes'],
    queryFn: getNodes,
    refetchInterval: interval,
    retry: 2,
  });
}

export function useNode(nodeId: string) {
  return useQuery({
    queryKey: ['node', nodeId],
    queryFn: () => getNode(nodeId),
    enabled: !!nodeId,
    refetchInterval: interval,
    retry: 2,
  });
}

// ─── Flows ───────────────────────────────────────────────────────────────────

export function useFlowTables(nodeId: string) {
  return useQuery({
    queryKey: ['flowTables', nodeId],
    queryFn: () => getFlowTables(nodeId),
    enabled: !!nodeId,
    refetchInterval: interval,
    retry: 2,
  });
}

export function useFlows(nodeId: string, tableId: number) {
  return useQuery({
    queryKey: ['flows', nodeId, tableId],
    queryFn: () => getFlows(nodeId, tableId),
    enabled: !!nodeId && tableId >= 0,
    refetchInterval: interval,
    retry: 2,
  });
}

export function useFlowStatistics(nodeId: string, tableId: number) {
  return useQuery({
    queryKey: ['flowStats', nodeId, tableId],
    queryFn: () => getFlowStatistics(nodeId, tableId),
    enabled: !!nodeId && tableId >= 0,
    refetchInterval: interval,
    retry: 2,
  });
}

export function useAddFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, tableId, flowId, flowData }: {
      nodeId: string;
      tableId: number;
      flowId: string;
      flowData: Partial<Flow>;
    }) => addFlow(nodeId, tableId, flowId, flowData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      queryClient.invalidateQueries({ queryKey: ['flowTables'] });
    },
  });
}

export function useDeleteFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, tableId, flowId }: {
      nodeId: string;
      tableId: number;
      flowId: string;
    }) => deleteFlow(nodeId, tableId, flowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      queryClient.invalidateQueries({ queryKey: ['flowTables'] });
    },
  });
}

// ─── Controller ──────────────────────────────────────────────────────────────

export function useControllerModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: getControllerModules,
    refetchInterval: interval * 6, // less frequent
    retry: 2,
  });
}

export function useControllerStatus() {
  return useQuery({
    queryKey: ['controllerStatus'],
    queryFn: getControllerStatus,
    refetchInterval: interval,
    retry: 1,
  });
}
