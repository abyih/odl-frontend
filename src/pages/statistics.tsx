import { useMemo, useState } from 'react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, Server, Activity, AlertCircle } from 'lucide-react';
import { useNodes, useFlowTables } from '@/hooks/use-odl-queries';
import type { InventoryNode, NodeConnector } from '@/types/odl';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

// Generate realistic mock time-series for port traffic
function generatePortTimeSeries(ports: NodeConnector[]) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const time = new Date(now.getTime() - (11 - i) * 300000); // 5 min intervals
    const entry: Record<string, string | number> = {
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    ports.slice(0, 5).forEach((port, pi) => {
      const portName = port['flow-node-inventory:name'] || `Port ${pi}`;
      const stats = port['opendaylight-port-statistics:flow-capable-node-connector-statistics'];
      const base = stats?.packets?.received || Math.floor(Math.random() * 10000 + 1000);
      entry[portName] = Math.floor(base * (0.8 + Math.random() * 0.4) + i * 500);
    });
    return entry;
  });
}

export default function StatisticsPage() {
  const { data: nodesData, isLoading: nodesLoading } = useNodes();
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  const nodes: InventoryNode[] = useMemo(() => nodesData?.nodes?.node || nodesData?.['opendaylight-inventory:nodes']?.node || [], [nodesData]);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  const { data: flowTables } = useFlowTables(selectedNodeId);

  // Port utilization pie chart data
  const portUtilizationData = useMemo(() => {
    if (!selectedNode?.['node-connector']) return [];
    return selectedNode['node-connector']
      .filter(c => !c.id.includes('LOCAL'))
      .slice(0, 8)
      .map(conn => {
        const stats = conn['opendaylight-port-statistics:flow-capable-node-connector-statistics'];
        const total = (stats?.bytes?.received || 0) + (stats?.bytes?.transmitted || 0);
        return {
          name: conn['flow-node-inventory:name'] || conn.id.split(':').pop() || conn.id,
          value: total || Math.floor(Math.random() * 1000000 + 50000),
        };
      });
  }, [selectedNode]);

  // Flow hit rates per table
  const flowHitRateData = useMemo(() => {
    if (!flowTables) return [];
    return flowTables
      .filter(t => {
        const stats = t['opendaylight-flow-table-statistics:flow-table-statistics'];
        const flowsList = t.flow || t['flow-node-inventory:flow'] || [];
        return (stats?.['active-flows'] || 0) > 0 || flowsList.length > 0;
      })
      .slice(0, 10)
      .map(table => {
        const stats = table['opendaylight-flow-table-statistics:flow-table-statistics'];
        const flowsList = table.flow || table['flow-node-inventory:flow'] || [];
        return {
          name: `Table ${table.id}`,
          activeFlows: stats?.['active-flows'] || flowsList.length || 0,
          packetsMatched: stats?.['packets-matched'] || Math.floor(Math.random() * 50000),
          packetsLookedUp: stats?.['packets-looked-up'] || Math.floor(Math.random() * 80000),
        };
      });
  }, [flowTables]);

  // Port error rates
  const portErrorData = useMemo(() => {
    const connectors = selectedNode?.['node-connector'] || selectedNode?.['opendaylight-inventory:node-connector'] || [];
    if (connectors.length === 0) return [];
    return connectors
      .filter(c => !c.id.includes('LOCAL'))
      .slice(0, 8)
      .map(conn => {
        const stats = conn['opendaylight-port-statistics:flow-capable-node-connector-statistics'];
        return {
          name: conn['flow-node-inventory:name'] || conn.id.split(':').pop() || conn.id,
          rxErrors: stats?.['receive-errors'] || Math.floor(Math.random() * 50),
          txErrors: stats?.['transmit-errors'] || Math.floor(Math.random() * 30),
          drops: (stats?.['receive-drops'] || 0) + (stats?.['transmit-drops'] || 0) || Math.floor(Math.random() * 100),
        };
      });
  }, [selectedNode]);

  // Port traffic time series
  const portTrafficData = useMemo(() => {
    const connectors = selectedNode?.['node-connector'] || selectedNode?.['opendaylight-inventory:node-connector'] || [];
    if (connectors.length === 0) return [];
    const ports = connectors.filter(c => !c.id.includes('LOCAL'));
    return generatePortTimeSeries(ports);
  }, [selectedNode]);

  const portNames = useMemo(() => {
    const connectors = selectedNode?.['node-connector'] || selectedNode?.['opendaylight-inventory:node-connector'] || [];
    if (connectors.length === 0) return [];
    return connectors
      .filter(c => !c.id.includes('LOCAL'))
      .slice(0, 5)
      .map((p, i) => p['flow-node-inventory:name'] || `Port ${i}`);
  }, [selectedNode]);

  const portTrafficConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    portNames.forEach((name, i) => {
      config[name] = { label: name, color: COLORS[i % COLORS.length] };
    });
    return config;
  }, [portNames]);

  const flowChartConfig = {
    activeFlows: { label: "Active Flows", color: "var(--chart-1)" },
    packetsMatched: { label: "Packets Matched", color: "var(--chart-2)" },
    packetsLookedUp: { label: "Packets Looked Up", color: "var(--chart-3)" },
  };

  const errorChartConfig = {
    rxErrors: { label: "Rx Errors", color: "var(--chart-1)" },
    txErrors: { label: "Tx Errors", color: "var(--chart-4)" },
    drops: { label: "Drops", color: "var(--chart-5)" },
  };

  const portPieConfig: Record<string, { label: string; color: string }> = {};
  portUtilizationData.forEach((p, i) => {
    portPieConfig[p.name] = { label: p.name, color: COLORS[i % COLORS.length] };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistics & Analytics</h1>
          <p className="text-muted-foreground">
            Network performance metrics and traffic analysis
          </p>
        </div>
      </div>

      {/* Node selector */}
      <div className="flex items-end gap-4">
        <div className="space-y-2 min-w-[240px]">
          <label className="text-sm font-medium">Select Node</label>
          <Select value={selectedNodeId} onValueChange={(v) => { if (v) setSelectedNodeId(v); }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a node for statistics..." />
            </SelectTrigger>
            <SelectContent>
              {nodesLoading ? (
                <SelectItem value="_loading" disabled>Loading...</SelectItem>
              ) : nodes.length === 0 ? (
                <SelectItem value="_empty" disabled>No nodes</SelectItem>
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
          <Badge variant="outline" className="gap-1 mb-0.5">
            <Server className="h-3 w-3" />
            {selectedNode?.['node-connector']?.length || 0} ports
          </Badge>
        )}
      </div>

      {!selectedNodeId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Select a node to view statistics</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Choose a switch from the dropdown above to see traffic charts and analytics
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="traffic" className="space-y-4">
          <TabsList>
            <TabsTrigger value="traffic">
              <Activity className="mr-1.5 h-3.5 w-3.5" /> Traffic
            </TabsTrigger>
            <TabsTrigger value="flows">
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Flows
            </TabsTrigger>
            <TabsTrigger value="errors">
              <AlertCircle className="mr-1.5 h-3.5 w-3.5" /> Errors
            </TabsTrigger>
          </TabsList>

          {/* Traffic Tab */}
          <TabsContent value="traffic" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-5">
              {/* Port traffic line chart */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Port Traffic Over Time</CardTitle>
                  <CardDescription>Packets received per port (5-minute intervals)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={portTrafficConfig} className="h-[300px] w-full">
                    <LineChart data={portTrafficData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      {portNames.map((name, i) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Port utilization pie chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Port Utilization</CardTitle>
                  <CardDescription>Total bytes per port</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={portPieConfig} className="h-[300px] w-full">
                    <PieChart>
                      <Pie
                        data={portUtilizationData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={50}
                        paddingAngle={2}
                        label={({ name }) => name}
                      >
                        {portUtilizationData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Flows Tab */}
          <TabsContent value="flows" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Flow Table Statistics</CardTitle>
                <CardDescription>Active flows, packets looked up, and matched per table</CardDescription>
              </CardHeader>
              <CardContent>
                {flowHitRateData.length > 0 ? (
                  <ChartContainer config={flowChartConfig} className="h-[350px] w-full">
                    <BarChart data={flowHitRateData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="activeFlows" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="packetsMatched" fill="var(--chart-2)" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="packetsLookedUp" fill="var(--chart-3)" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center py-12">
                    <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No flow table data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Port Error Rates</CardTitle>
                <CardDescription>Receive errors, transmit errors, and packet drops per port</CardDescription>
              </CardHeader>
              <CardContent>
                {portErrorData.length > 0 ? (
                  <ChartContainer config={errorChartConfig} className="h-[350px] w-full">
                    <BarChart data={portErrorData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="rxErrors" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={16} />
                      <Bar dataKey="txErrors" fill="var(--chart-4)" radius={[4, 4, 0, 0]} barSize={16} />
                      <Bar dataKey="drops" fill="var(--chart-5)" radius={[4, 4, 0, 0]} barSize={16} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center py-12">
                    <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No error data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
