import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { GitBranch, Trash2, AlertTriangle, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlowForm } from '@/components/flow-form';
import { useNodes, useFlowTables, useFlows, useAddFlow, useDeleteFlow } from '@/hooks/use-odl-queries';
import { toast } from 'sonner';
import type { Flow, InventoryNode } from '@/types/odl';

export default function FlowsPage() {
  const { data: nodesData, isLoading: nodesLoading } = useNodes();
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<number>(0);
  const [deleteTarget, setDeleteTarget] = useState<{ nodeId: string; tableId: number; flowId: string } | null>(null);

  const nodes: InventoryNode[] = useMemo(() => nodesData?.nodes?.node || nodesData?.['opendaylight-inventory:nodes']?.node || [], [nodesData]);

  const { data: flowTables, isLoading: tablesLoading } = useFlowTables(selectedNodeId);
  const { data: flows, isLoading: flowsLoading } = useFlows(selectedNodeId, selectedTableId);

  const addFlowMutation = useAddFlow();
  const deleteFlowMutation = useDeleteFlow();

  const nonEmptyTables = useMemo(() => {
    return (flowTables || []).filter(t => {
      const flowsList = t.flow || t['flow-node-inventory:flow'] || [];
      return flowsList.length > 0 || t.id === selectedTableId;
    });
  }, [flowTables, selectedTableId]);

  const handleAddFlow = async ({ flowId, flowData }: { flowId: string; flowData: Partial<Flow> }) => {
    try {
      await addFlowMutation.mutateAsync({
        nodeId: selectedNodeId,
        tableId: selectedTableId,
        flowId,
        flowData,
      });
      toast.success('Flow installed successfully');
    } catch (err) {
      toast.error('Failed to install flow');
      console.error(err);
    }
  };

  const handleDeleteFlow = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFlowMutation.mutateAsync(deleteTarget);
      toast.success('Flow deleted successfully');
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Failed to delete flow');
      console.error(err);
    }
  };

  const formatMatch = (match: Flow['match']): string => {
    const parts: string[] = [];
    if (match['in-port']) parts.push(`in_port=${match['in-port'].split(':').pop()}`);
    if (match['ethernet-match']?.['ethernet-type']) parts.push(`eth_type=${match['ethernet-match']['ethernet-type'].type}`);
    if (match['ipv4-source']) parts.push(`src=${match['ipv4-source']}`);
    if (match['ipv4-destination']) parts.push(`dst=${match['ipv4-destination']}`);
    if (match['ip-match']?.['ip-protocol']) parts.push(`proto=${match['ip-match']['ip-protocol']}`);
    return parts.join(', ') || 'any';
  };

  const formatActions = (flow: Flow): string => {
    const instructions = flow.instructions?.instruction || [];
    const parts: string[] = [];
    for (const inst of instructions) {
      const actions = inst['apply-actions']?.action || inst['write-actions']?.action || [];
      for (const action of actions) {
        if (action['output-action']) {
          parts.push(`output:${action['output-action']['output-node-connector']}`);
        } else if (action['drop-action'] !== undefined) {
          parts.push('drop');
        } else if (action['set-field']) {
          parts.push('set-field');
        }
      }
      if (inst['go-to-table']) {
        parts.push(`goto:${inst['go-to-table'].table_id}`);
      }
    }
    return parts.join(', ') || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flow Management</h1>
          <p className="text-muted-foreground">
            View, add, and delete OpenFlow entries on switches
          </p>
        </div>
      </div>

      {/* Node and Table selectors */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2 min-w-[200px]">
          <label className="text-sm font-medium">Select Node</label>
          <Select value={selectedNodeId} onValueChange={(v) => { if (v) { setSelectedNodeId(v); setSelectedTableId(0); } }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a node..." />
            </SelectTrigger>
            <SelectContent>
              {nodesLoading ? (
                <SelectItem value="_loading" disabled>Loading...</SelectItem>
              ) : nodes.length === 0 ? (
                <SelectItem value="_empty" disabled>No nodes available</SelectItem>
              ) : (
                nodes.map(n => (
                  <SelectItem key={n.id} value={n.id}>
                    <span className="font-mono text-xs">{n.id}</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedNodeId && (
          <div className="space-y-2 min-w-[160px]">
            <label className="text-sm font-medium">Flow Table</label>
            <Select
              value={String(selectedTableId)}
              onValueChange={(v) => { if (v) setSelectedTableId(parseInt(v)); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select table..." />
              </SelectTrigger>
              <SelectContent>
                {tablesLoading ? (
                  <SelectItem value="_loading" disabled>Loading...</SelectItem>
                ) : nonEmptyTables.length === 0 ? (
                  <SelectItem value="0">Table 0</SelectItem>
                ) : (
                  nonEmptyTables.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      Table {t.id} ({t.flow?.length || 0} flows)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedNodeId && (
          <FlowForm
            nodeId={selectedNodeId}
            tableId={selectedTableId}
            onSubmit={handleAddFlow}
            isSubmitting={addFlowMutation.isPending}
          />
        )}
      </div>

      {/* Table Statistics */}
      {selectedNodeId && flowTables && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(() => {
            const tableStats = flowTables.find(t => t.id === selectedTableId);
            const fts = tableStats?.['opendaylight-flow-table-statistics:flow-table-statistics'];
            return (
              <>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Active Flows</p>
                      <p className="text-lg font-bold">{fts?.['active-flows'] || flows?.length || 0}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                      <Server className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Packets Looked Up</p>
                      <p className="text-lg font-bold">{(fts?.['packets-looked-up'] || 0).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Packets Matched</p>
                      <p className="text-lg font-bold">{(fts?.['packets-matched'] || 0).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      )}

      {/* Flows Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            Flow Entries
          </CardTitle>
          <CardDescription>
            {selectedNodeId
              ? `Flows on ${selectedNodeId} — Table ${selectedTableId}`
              : 'Select a node to view flow entries'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedNodeId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GitBranch className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Select a node above to view its flow tables</p>
            </div>
          ) : flowsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : flows && flows.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Packets</TableHead>
                    <TableHead>Bytes</TableHead>
                    <TableHead>Timeouts</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flows.map(flow => {
                    const stats = flow['opendaylight-flow-statistics:flow-statistics'];
                    return (
                      <TableRow key={flow.id}>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">{flow.id}</TableCell>
                        <TableCell className="text-sm">{flow['flow-name'] || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{flow.priority}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {formatMatch(flow.match)}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[180px] truncate">
                          {formatActions(flow)}
                        </TableCell>
                        <TableCell className="text-sm">{(stats?.['packet-count'] || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-sm">{(stats?.['byte-count'] || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {flow['idle-timeout'] || 0}s / {flow['hard-timeout'] || 0}s
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setDeleteTarget({
                              nodeId: selectedNodeId,
                              tableId: selectedTableId,
                              flowId: flow.id,
                            })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GitBranch className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No flows in Table {selectedTableId}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Use "Add Flow" to install new flow entries
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Flow
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete flow <span className="font-mono text-foreground">{deleteTarget?.flowId}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFlow} disabled={deleteFlowMutation.isPending}>
              {deleteFlowMutation.isPending ? 'Deleting...' : 'Delete Flow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
