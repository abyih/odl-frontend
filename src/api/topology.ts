import apiClient from './client';
import type { TopologyResponse } from '@/types/odl';

export async function getTopology(): Promise<TopologyResponse> {
  const { data } = await apiClient.get<TopologyResponse>(
    '/rests/data/network-topology:network-topology?content=nonconfig'
  );
  return data;
}

export async function getTopologyConfig(): Promise<TopologyResponse> {
  const { data } = await apiClient.get<TopologyResponse>(
    '/rests/data/network-topology:network-topology?content=config'
  );
  return data;
}
