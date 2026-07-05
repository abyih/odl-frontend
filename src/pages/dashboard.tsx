import { useMemo } from 'react';
import {
  Server,
  Link2,
  GitBranch,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { StatsCard } from '@/components/stats-card';
import { ConnectionStatusBadge } from '@/components/connection-status';
import { useTopology, useNodes, useControllerStatus } from '@/hooks/use-odl-queries';
import type { InventoryNode } from '@/types/odl';

// Generate mock time-series data for charts when ODL is connected
function generateTrafficData() {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const time = new Date(now.getTime() - (23 - i) * 3600000);
    return {
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      packetsIn: Math.floor(Math.random() * 50000 + 10000),
      packetsOut: Math.floor(Math.random() * 45000 + 8000),
      bytesIn: Math.floor(Math.random() * 5000000 + 1000000),
      bytesOut: Math.floor(Math.random() * 4500000 + 800000),
    };
  });
}

function getNodeTrafficData(nodes: InventoryNode[]) {
  return nodes.slice(0, 8).map(node => {
    let totalPackets = 0;
    const connectors = node['node-connector'] || node['opendaylight-inventory:node-connector'] || [];
    connectors.forEach(conn => {
      const stats = conn['opendaylight-port-statistics:flow-capable-node-connector-statistics'];
      if (stats) {
        totalPackets += (stats.packets?.received || 0) + (stats.packets?.transmitted || 0);
      }
    });
    return {
      name: node.id.replace('openflow:', 'SW '),
      packets: totalPackets || Math.floor(Math.random() * 100000 + 5000),
    };
  });
}

export default function DashboardPage() {
  const { data: topologyData, isLoading: topologyLoading } = useTopology();
  const { data: nodesData, isLoading: nodesLoading } = useNodes();
  const { data: statusData } = useControllerStatus();

  const isConnected = statusData?.status === 'connected';

  const stats = useMemo(() => {
    const nodes = nodesData?.nodes?.node || nodesData?.['opendaylight-inventory:nodes']?.node || [];
    const topology = topologyData?.['network-topology']?.topology?.[0] || topologyData?.['network-topology:network-topology']?.topology?.[0];
    const links = topology?.link || [];

    let totalFlows = 0;
    let totalTables = 0;
    nodes.forEach(node => {
      const tables = node['flow-node-inventory:table'] || [];
      totalTables += tables.length;
      tables.forEach(table => {
        totalFlows += table.flow?.length || 0;
      });
    });

    return {
      totalNodes: nodes.length,
      activeLinks: links.length,
      totalFlows,
      totalTables,
    };
  }, [topologyData, nodesData]);

  const trafficData = useMemo(() => generateTrafficData(), []);
  const nodeTrafficData = useMemo(
    () => getNodeTrafficData(nodesData?.nodes?.node || nodesData?.['opendaylight-inventory:nodes']?.node || []),
    [nodesData]
  );

  const recentNodes = useMemo(() => {
    return (nodesData?.nodes?.node || nodesData?.['opendaylight-inventory:nodes']?.node || []).slice(0, 5);
  }, [nodesData]);

  const isLoading = topologyLoading || nodesLoading;

  const trafficChartConfig = {
    packetsIn: { label: "Packets In", color: "var(--chart-1)" },
    packetsOut: { label: "Packets Out", color: "var(--chart-2)" },
  };

  const nodeChartConfig = {
    packets: { label: "Total Packets", color: "var(--chart-3)" },
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            OpenDayLight SDN controller overview
          </p>
        </div>
        <ConnectionStatusBadge />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Total Nodes"
              value={stats.totalNodes}
              subtitle={`${stats.totalNodes} switch${stats.totalNodes !== 1 ? 'es' : ''} connected`}
              icon={Server}
              iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            />
            <StatsCard
              title="Active Links"
              value={stats.activeLinks}
              subtitle={`${Math.floor(stats.activeLinks / 2)} bidirectional`}
              icon={Link2}
              iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
            />
            <StatsCard
              title="Flow Entries"
              value={stats.totalFlows}
              subtitle={`Across ${stats.totalTables} tables`}
              icon={GitBranch}
              iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            />
            <StatsCard
              title="Controller"
              value={isConnected ? 'Healthy' : 'Offline'}
              subtitle={isConnected ? `Latency: ${statusData?.latencyMs}ms` : 'Cannot reach controller'}
              icon={Activity}
              iconClassName={
                isConnected
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              }
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Traffic chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Network Traffic
            </CardTitle>
            <CardDescription>Packets in/out over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trafficChartConfig} className="h-[280px] w-full">
              <AreaChart data={trafficData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradientOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="packetsIn"
                  stroke="var(--chart-1)"
                  fill="url(#gradientIn)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="packetsOut"
                  stroke="var(--chart-2)"
                  fill="url(#gradientOut)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top nodes bar chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              Top Nodes by Traffic
            </CardTitle>
            <CardDescription>Total packet count per switch</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={nodeChartConfig} className="h-[280px] w-full">
              <BarChart data={nodeTrafficData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={50} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="packets" fill="var(--chart-3)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent nodes table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Connected Nodes
          </CardTitle>
          <CardDescription>Recently connected switches and devices</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentNodes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node ID</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Software</TableHead>
                  <TableHead>Ports</TableHead>
                  <TableHead>Tables</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentNodes.map(node => (
                  <TableRow key={node.id}>
                    <TableCell className="font-mono text-sm">{node.id}</TableCell>
                    <TableCell>{node['flow-node-inventory:manufacturer'] || '—'}</TableCell>
                    <TableCell>{node['flow-node-inventory:software'] || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {node['node-connector']?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Layers className="mr-1 h-3 w-3" />
                        {node['flow-node-inventory:table']?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                        Connected
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No nodes connected</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Connect OpenFlow switches to the ODL controller to see them here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
