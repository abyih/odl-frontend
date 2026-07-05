import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Server, Search, ChevronDown, ChevronRight, Cpu, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNodes, useNode } from '@/hooks/use-odl-queries';
import type { InventoryNode } from '@/types/odl';

export default function NodesPage() {
  const { data: nodesData, isLoading } = useNodes();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: selectedNodeDetail } = useNode(selectedNodeId || '');

  const nodes: InventoryNode[] = useMemo(() => {
    const allNodes = nodesData?.nodes?.node || nodesData?.['opendaylight-inventory:nodes']?.node || [];
    if (!searchTerm) return allNodes;
    const lower = searchTerm.toLowerCase();
    return allNodes.filter(
      n =>
        n.id.toLowerCase().includes(lower) ||
        (n['flow-node-inventory:manufacturer'] || '').toLowerCase().includes(lower) ||
        (n['flow-node-inventory:software'] || '').toLowerCase().includes(lower)
    );
  }, [nodesData, searchTerm]);

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Node Management</h1>
          <p className="text-muted-foreground">
            Manage connected OpenFlow switches and devices
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Server className="h-3 w-3" />
          {nodes.length} node{nodes.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search nodes by ID, manufacturer..."
          className="pl-9"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Nodes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Nodes</CardTitle>
          <CardDescription>Click rows to expand and view port details</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : nodes.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Node ID</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Hardware</TableHead>
                    <TableHead>Software</TableHead>
                    <TableHead>Ports</TableHead>
                    <TableHead>Flow Tables</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map(node => {
                    const isExpanded = expandedNodes.has(node.id);
                    const connectors = node['node-connector'] || node['opendaylight-inventory:node-connector'] || [];
                    const tables = node['flow-node-inventory:table'] || node.table || [];

                    return (
                      <>
                        <TableRow
                          key={node.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpanded(node.id)}
                        >
                          <TableCell>
                            {connectors.length > 0 && (
                              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-medium">{node.id}</TableCell>
                          <TableCell>{node['flow-node-inventory:manufacturer'] || '—'}</TableCell>
                          <TableCell>{node['flow-node-inventory:hardware'] || '—'}</TableCell>
                          <TableCell>{node['flow-node-inventory:software'] || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{connectors.length}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{tables.length}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                              Connected
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNodeId(node.id);
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${node.id}-expanded`}>
                            <TableCell colSpan={9} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <h4 className="text-sm font-medium mb-3">Port Details ({connectors.length})</h4>
                                {connectors.length > 0 ? (
                                  <div className="rounded-md border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Port ID</TableHead>
                                          <TableHead>Name</TableHead>
                                          <TableHead>MAC Address</TableHead>
                                          <TableHead>State</TableHead>
                                          <TableHead>Rx Packets</TableHead>
                                          <TableHead>Tx Packets</TableHead>
                                          <TableHead>Rx Bytes</TableHead>
                                          <TableHead>Tx Bytes</TableHead>
                                          <TableHead>Errors</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {connectors.map(conn => {
                                          const stats = conn['opendaylight-port-statistics:flow-capable-node-connector-statistics'];
                                          return (
                                            <TableRow key={conn.id}>
                                              <TableCell className="font-mono text-xs">{conn['flow-node-inventory:port-number'] || conn.id.split(':').pop()}</TableCell>
                                              <TableCell className="text-xs">{conn['flow-node-inventory:name'] || '—'}</TableCell>
                                              <TableCell className="font-mono text-xs">{conn['flow-node-inventory:hardware-address'] || '—'}</TableCell>
                                              <TableCell>
                                                {conn['flow-node-inventory:state'] ? (
                                                  <Badge variant={conn['flow-node-inventory:state']['link-down'] ? 'destructive' : 'default'} className="text-xs">
                                                    {conn['flow-node-inventory:state']['link-down'] ? 'Down' : 'Up'}
                                                  </Badge>
                                                ) : '—'}
                                              </TableCell>
                                              <TableCell className="text-xs">{stats?.packets?.received?.toLocaleString() || '0'}</TableCell>
                                              <TableCell className="text-xs">{stats?.packets?.transmitted?.toLocaleString() || '0'}</TableCell>
                                              <TableCell className="text-xs">{formatBytes(stats?.bytes?.received || 0)}</TableCell>
                                              <TableCell className="text-xs">{formatBytes(stats?.bytes?.transmitted || 0)}</TableCell>
                                              <TableCell className="text-xs text-red-500">
                                                {((stats?.['receive-errors'] || 0) + (stats?.['transmit-errors'] || 0)).toLocaleString()}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No port data available</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'No nodes match your search' : 'No nodes connected'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Node detail sheet */}
      <Sheet open={!!selectedNodeId} onOpenChange={() => setSelectedNodeId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              <span className="font-mono">{selectedNodeId}</span>
            </SheetTitle>
            <SheetDescription>Complete node inventory details</SheetDescription>
          </SheetHeader>

          {selectedNodeDetail && (
            <div className="mt-6 space-y-6">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Manufacturer</p>
                  <p>{selectedNodeDetail['flow-node-inventory:manufacturer'] || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Hardware</p>
                  <p>{selectedNodeDetail['flow-node-inventory:hardware'] || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Software</p>
                  <p>{selectedNodeDetail['flow-node-inventory:software'] || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Serial Number</p>
                  <p>{selectedNodeDetail['flow-node-inventory:serial-number'] || '—'}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Description</p>
                  <p>{selectedNodeDetail['flow-node-inventory:description'] || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">IP Address</p>
                  <p className="font-mono">{selectedNodeDetail['flow-node-inventory:ip-address'] || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Ports</p>
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                    {(selectedNodeDetail['node-connector'] || selectedNodeDetail['opendaylight-inventory:node-connector'])?.length || 0}
                  </div>
                </div>
              </div>

              {/* Summary stats */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="text-sm font-medium">Summary Statistics</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Flow Tables</p>
                    <p className="font-medium">{(selectedNodeDetail['flow-node-inventory:table'] || selectedNodeDetail.table)?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Flows</p>
                    <p className="font-medium">
                      {(selectedNodeDetail['flow-node-inventory:table'] || selectedNodeDetail.table)?.reduce(
                        (acc, t) => acc + (t.flow?.length || 0), 0
                      ) || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
