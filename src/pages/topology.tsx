import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Network, Server, Link2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopologyGraph } from '@/components/topology-graph';
import { useTopology, useNode } from '@/hooks/use-odl-queries';
import type { Topology } from '@/types/odl';

export default function TopologyPage() {
  const { data: topologyData, isLoading } = useTopology();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ width: 800, height: 500 });

  const { data: selectedNode } = useNode(selectedNodeId || '');

  const topology: Topology | null = useMemo(() => {
    const topos = topologyData?.['network-topology']?.topology || topologyData?.['network-topology:network-topology']?.topology;
    if (!topos || topos.length === 0) return null;
    // Merge all topologies or use flow:1
    return topos.find(t => t['topology-id'] === 'flow:1') || topos[0];
  }, [topologyData]);

  const topoNodes = useMemo(() => {
    if (!topology) return [];
    return topology.node || topology['network-topology:node'] || [];
  }, [topology]);

  const stats = useMemo(() => {
    if (!topology) return { nodes: 0, links: 0, ports: 0 };
    const nodes = topoNodes.filter(n => n['node-id'].startsWith('openflow:'));
    const links = topology.link || topology['network-topology:link'] || [];
    const ports = nodes.reduce((acc, n) => {
      const tps = n['termination-point'] || n['network-topology:termination-point'] || [];
      return acc + tps.length;
    }, 0);
    return { nodes: nodes.length, links: links.length, ports };
  }, [topology, topoNodes]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Resize observer for responsive graph
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setGraphSize({
          width: Math.max(400, width - 32),
          height: isFullscreen ? window.innerHeight - 200 : 500,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [isFullscreen]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Network Topology</h1>
          <p className="text-muted-foreground">
            Interactive view of the SDN network graph
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Server className="h-3 w-3" /> {stats.nodes} nodes
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Link2 className="h-3 w-3" /> {stats.links} links
          </Badge>
        </div>
      </div>

      {/* Topology Graph */}
      <Card ref={containerRef}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                Topology Map
              </CardTitle>
              <CardDescription>Click nodes to view details. Drag to reposition.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center">
          {isLoading ? (
            <Skeleton className="h-[500px] w-full rounded-lg" />
          ) : (
            <TopologyGraph
              topology={topology}
              width={graphSize.width}
              height={graphSize.height}
              onNodeClick={handleNodeClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Topology Node List */}
      <Card>
        <CardHeader>
          <CardTitle>Topology Nodes</CardTitle>
          <CardDescription>All nodes discovered in the network topology</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : topoNodes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Termination Points</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topoNodes.map(node => {
                  const tps = node['termination-point'] || node['network-topology:termination-point'] || [];
                  return (
                    <TableRow key={node['node-id']}>
                      <TableCell className="font-mono text-sm">{node['node-id']}</TableCell>
                      <TableCell>
                        <Badge variant={node['node-id'].startsWith('openflow:') ? 'default' : 'secondary'}>
                          {node['node-id'].startsWith('openflow:') ? 'Switch' : 'Host'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tps.length}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedNodeId(node['node-id'])}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Network className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No topology data available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Ensure OpenFlow switches are connected to the controller
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Node detail sheet */}
      <Sheet open={!!selectedNodeId} onOpenChange={() => setSelectedNodeId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono">{selectedNodeId}</SheetTitle>
            <SheetDescription>Node details and port information</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {selectedNode && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Manufacturer</p>
                    <p className="text-sm font-medium">{selectedNode['flow-node-inventory:manufacturer'] || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hardware</p>
                    <p className="text-sm font-medium">{selectedNode['flow-node-inventory:hardware'] || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Software</p>
                    <p className="text-sm font-medium">{selectedNode['flow-node-inventory:software'] || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Serial Number</p>
                    <p className="text-sm font-medium">{selectedNode['flow-node-inventory:serial-number'] || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">IP Address</p>
                    <p className="text-sm font-medium">{selectedNode['flow-node-inventory:ip-address'] || '—'}</p>
                  </div>
                </div>

                {(() => {
                  const connectors = selectedNode['node-connector'] || selectedNode['opendaylight-inventory:node-connector'] || [];
                  if (connectors.length === 0) return null;
                  return (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Ports ({connectors.length})</h4>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {connectors.map(connector => (
                          <div key={connector.id} className="rounded-lg border p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs">{connector.id}</span>
                              {connector['flow-node-inventory:state'] && (
                                <Badge variant={connector['flow-node-inventory:state']['link-down'] ? 'destructive' : 'default'} className="text-xs">
                                  {connector['flow-node-inventory:state']['link-down'] ? 'Down' : 'Up'}
                                </Badge>
                              )}
                            </div>
                            {connector['flow-node-inventory:hardware-address'] && (
                              <p className="text-xs text-muted-foreground mt-1">
                                MAC: {connector['flow-node-inventory:hardware-address']}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
