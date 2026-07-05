import apiClient from './client';
import type { ModulesResponse } from '@/types/odl';

export async function getControllerModules(): Promise<ModulesResponse> {
  const { data } = await apiClient.get<ModulesResponse>(
    '/rests/data/ietf-yang-library:modules-state?content=nonconfig'
  );
  return data;
}

export async function getControllerStatus(): Promise<{ status: 'connected' | 'disconnected'; latencyMs: number }> {
  const start = performance.now();
  try {
    await apiClient.get('/rests/data/ietf-yang-library:modules-state?content=nonconfig', { timeout: 5000 });
    const latencyMs = Math.round(performance.now() - start);
    return { status: 'connected', latencyMs };
  } catch {
    return { status: 'disconnected', latencyMs: -1 };
  }
}
