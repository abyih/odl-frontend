import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Server,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNodes, useTopology } from '@/hooks/use-odl-queries';
import { toast } from 'sonner';

// Define anomaly type
interface Anomaly {
  id: string;
  time: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  nodeId: string;
  type: string;
  description: string;
  status: 'active' | 'investigating' | 'acknowledged';
}

const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const INITIAL_SIMULATED_ANOMALIES: Anomaly[] = [
  {
    id: 'ANM-001',
    time: '2026-07-07 09:12:04',
    severity: 'critical',
    nodeId: 'openflow:1',
    type: 'Flow Table Flooding',
    description: 'Rapid insertion of temporary flows (250/sec) matching random destination ports, suggesting a port scan.',
    status: 'active',
  },
  {
    id: 'ANM-002',
    time: '2026-07-07 09:05:43',
    severity: 'high',
    nodeId: 'openflow:2',
    type: 'MAC Flapping',
    description: 'MAC address 00:1A:2B:3C:4D:5E quickly moving between port 2 and port 4.',
    status: 'investigating',
  },
  {
    id: 'ANM-003',
    time: '2026-07-07 08:51:12',
    severity: 'medium',
    nodeId: 'openflow:1',
    type: 'Port Congestion',
    description: 'Traffic on port 3 exceeded 95% of link capacity for more than 5 minutes.',
    status: 'active',
  },
];

// Mock historical time series data
const timeSeriesData = [
  { time: '04:00', critical: 0, high: 1, medium: 2, low: 1 },
  { time: '05:00', critical: 1, high: 0, medium: 1, low: 2 },
  { time: '06:00', critical: 0, high: 0, medium: 2, low: 1 },
  { time: '07:00', critical: 0, high: 1, medium: 1, low: 3 },
  { time: '08:00', critical: 1, high: 2, medium: 3, low: 0 },
  { time: '09:00', critical: 2, high: 3, medium: 4, low: 2 },
];

const categoryColors: Record<string, string> = {
  'Isolated Node Alert': 'hsl(var(--chart-1))',
  'Port Link Down': 'hsl(var(--chart-2))',
  'Port Blocked State': 'hsl(var(--chart-3))',
  'Interface Packet Drops': 'hsl(var(--chart-4))',
  'Port Interface Errors': 'hsl(var(--chart-5))',
  'Flow Table Flooding': 'hsl(var(--chart-1))',
  'MAC Flapping': 'hsl(var(--chart-2))',
  'Port Congestion': 'hsl(var(--chart-3))',
  'ARP Poisoning Attempt': 'hsl(var(--chart-4))',
  'ICMP Flood Detection': 'hsl(var(--chart-5))',
};

const severityColors: Record<string, string> = {
  critical: 'bg-red-500 hover:bg-red-600 text-white dark:bg-red-900/50 dark:text-red-300 border-red-600',
  high: 'bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-900/50 dark:text-orange-300 border-orange-600',
  medium: 'bg-yellow-500 hover:bg-yellow-600 text-black dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-600',
  low: 'bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-900/50 dark:text-blue-300 border-blue-600',
};

const statusColors: Record<string, string> = {
  active: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-red-200/50',
  investigating: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/50',
  acknowledged: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/50',
};

export default function AnomaliesPage() {
  const { data: nodesData, refetch: refetchNodes } = useNodes();
  const { data: topologyData, refetch: refetchTopology } = useTopology();

  const [simulatedAnomalies, setSimulatedAnomalies] = useState<Anomaly[]>(INITIAL_SIMULATED_ANOMALIES);
  const [realAnomalyStates, setRealAnomalyStates] = useState<Record<string, Anomaly['status']>>({});

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract nodes
  const nodes = useMemo(() => {
    return nodesData?.nodes?.node || nodesData?.['opendaylight-inventory:nodes']?.node || [];
  }, [nodesData]);

  // Extract topology links to identify isolated switch nodes
  const topologyLinks = useMemo(() => {
    const topology = topologyData?.['network-topology']?.topology?.[0] || topologyData?.['network-topology:network-topology']?.topology?.[0];
    return topology?.link || topology?.['network-topology:link'] || [];
  }, [topologyData]);

  // Parse ODL data dynamically to discover real-time network anomalies
  const realAnomalies = useMemo(() => {
    const list: Anomaly[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    nodes.forEach(node => {
      const connectors = node['node-connector'] || node['opendaylight-inventory:node-connector'] || [];

      // Anomaly 1: Isolated Switch fabric (No active links connecting this switch to the rest of the topology)
      const hasLinks = topologyLinks.some(link =>
        link.source?.['source-node'] === node.id ||
        link.destination?.['dest-node'] === node.id
      );
      if (nodes.length > 1 && topologyLinks.length > 0 && !hasLinks) {
        const id = `ANM-ISO-${node.id}`;
        list.push({
          id,
          time: timestamp,
          severity: 'critical',
          nodeId: node.id,
          type: 'Isolated Node Alert',
          description: `Switch ${node.id} is operational but has 0 active topology links. It is completely isolated from other switches.`,
          status: realAnomalyStates[id] || 'active',
        });
      }

      // Check port-level settings
      connectors.forEach(conn => {
        const portId = conn.id.split(':').pop() || conn.id;
        const portName = conn['flow-node-inventory:name'] || `Port ${portId}`;
        const isLocal = portId === 'LOCAL';

        // Skip parsing normal stats for virtual/local loopbacks
        if (isLocal) return;

        // Anomaly 2: Link Down
        const state = conn['flow-node-inventory:state'];
        if (state?.['link-down']) {
          const id = `ANM-LD-${node.id}-${portId}`;
          list.push({
            id,
            time: timestamp,
            severity: 'high',
            nodeId: node.id,
            type: 'Port Link Down',
            description: `The physical port connector ${portName} on switch ${node.id} is down or unplugged.`,
            status: realAnomalyStates[id] || 'active',
          });
        }

        // Anomaly 3: Blocked Port
        if (state?.blocked) {
          const id = `ANM-BLK-${node.id}-${portId}`;
          list.push({
            id,
            time: timestamp,
            severity: 'medium',
            nodeId: node.id,
            type: 'Port Blocked State',
            description: `Port ${portName} on ${node.id} is in an STP blocked state, preventing packet loops.`,
            status: realAnomalyStates[id] || 'active',
          });
        }

        // Anomaly 4: High Port Packet Drops
        const stats = conn['opendaylight-port-statistics:flow-capable-node-connector-statistics'];
        if (stats) {
          const rxDrops = stats['receive-drops'] || 0;
          const txDrops = stats['transmit-drops'] || 0;
          const totalDrops = rxDrops + txDrops;
          if (totalDrops > 0) {
            const id = `ANM-DRP-${node.id}-${portId}`;
            list.push({
              id,
              time: timestamp,
              severity: totalDrops > 100 ? 'high' : 'medium',
              nodeId: node.id,
              type: 'Interface Packet Drops',
              description: `Port ${portName} on switch ${node.id} reports packet drops (Rx: ${rxDrops}, Tx: ${txDrops}).`,
              status: realAnomalyStates[id] || 'active',
            });
          }

          // Anomaly 5: Interface Transmit/Receive Errors
          const rxErrors = stats['receive-errors'] || 0;
          const txErrors = stats['transmit-errors'] || 0;
          const totalErrors = rxErrors + txErrors;
          if (totalErrors > 0) {
            const id = `ANM-ERR-${node.id}-${portId}`;
            list.push({
              id,
              time: timestamp,
              severity: 'high',
              nodeId: node.id,
              type: 'Port Interface Errors',
              description: `Frame/CRC transmission errors detected on ${portName} (Rx Errors: ${rxErrors}, Tx Errors: ${txErrors}).`,
              status: realAnomalyStates[id] || 'active',
            });
          }
        }
      });
    });

    return list;
  }, [nodes, topologyLinks, realAnomalyStates]);

  // Combine real and simulated alerts
  const anomalies = useMemo(() => {
    return [...realAnomalies, ...simulatedAnomalies].sort((a, b) => {
      // Sort active first, then by severity, then by date
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      if (a.status === 'investigating' && b.status === 'acknowledged') return -1;
      if (a.status === 'acknowledged' && b.status === 'investigating') return 1;

      const orderA = SEVERITY_ORDER[a.severity] ?? 99;
      const orderB = SEVERITY_ORDER[b.severity] ?? 99;
      if (orderA !== orderB) return orderA - orderB;

      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
  }, [realAnomalies, simulatedAnomalies]);

  // Compute stat metrics
  const stats = useMemo(() => {
    const total = anomalies.length;
    const active = anomalies.filter(a => a.status === 'active').length;
    const critical = anomalies.filter(a => a.severity === 'critical').length;
    const investigating = anomalies.filter(a => a.status === 'investigating').length;
    return { total, active, critical, investigating };
  }, [anomalies]);

  // Filter list
  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(a => {
      const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchSearch =
        searchTerm === '' ||
        a.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.nodeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSeverity && matchStatus && matchSearch;
    });
  }, [anomalies, severityFilter, statusFilter, searchTerm]);

  // Chart data: categories distribution
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    anomalies.forEach(a => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: categoryColors[name] || 'hsl(var(--muted-foreground))',
    }));
  }, [anomalies]);

  // Action handlers
  const handleUpdateStatus = (id: string, newStatus: Anomaly['status']) => {
    const isReal = id.startsWith('ANM-ISO-') || id.startsWith('ANM-LD-') || id.startsWith('ANM-BLK-') || id.startsWith('ANM-DRP-') || id.startsWith('ANM-ERR-');

    if (isReal) {
      setRealAnomalyStates(prev => ({
        ...prev,
        [id]: newStatus,
      }));
    } else {
      setSimulatedAnomalies(prev =>
        prev.map(a => (a.id === id ? { ...a, status: newStatus } : a))
      );
    }
    toast.success(`Anomaly ${id} marked as ${newStatus}`);
  };

  const handleSimulateAnomaly = () => {
    const nodeChoices = nodes.length > 0 ? nodes.map(n => n.id) : ['openflow:1', 'openflow:2', 'openflow:3'];
    const randomNode = nodeChoices[Math.floor(Math.random() * nodeChoices.length)];

    const threatTemplates = [
      {
        type: 'ARP Poisoning Attempt',
        severity: 'high' as const,
        description: `Host MAC 00:AA:BB:CC:DD:EE claims IP 10.0.0.1 on port 1 of ${randomNode}, conflicting with router.`,
      },
      {
        type: 'DNS Traffic Peak',
        severity: 'medium' as const,
        description: `Sudden traffic burst of DNS queries (12,000 requests/min) from source IP 10.0.0.45.`,
      },
      {
        type: 'ICMP Flood Detection',
        severity: 'high' as const,
        description: `Inundation of ICMP Echo Requests (ping flood) targeted at 10.0.0.2 from external subnet.`,
      },
    ];

    const template = threatTemplates[Math.floor(Math.random() * threatTemplates.length)];
    const newAnomaly: Anomaly = {
      id: `ANM-0${Math.floor(Math.random() * 900) + 100}`,
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      nodeId: randomNode,
      status: 'active',
      ...template,
    };

    setSimulatedAnomalies(prev => [newAnomaly, ...prev]);
    toast.error(`NEW SECURITY ALERT: ${newAnomaly.type} detected on ${newAnomaly.nodeId}!`, {
      description: newAnomaly.description,
      duration: 5000,
    });
  };

  const handleSyncData = async () => {
    try {
      await Promise.all([refetchNodes(), refetchTopology()]);
      toast.success('Synchronized with ODL operational state.');
    } catch {
      toast.error('Sync failed. Controller might be unreachable.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anomalies & Alert Center</h1>
          <p className="text-muted-foreground">
            Volumetric drops, interface errors, STP prunes, and node isolations dynamically extracted from ODL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSimulateAnomaly} variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            Simulate Security Threat
          </Button>
          <Button variant="outline" size="sm" onClick={handleSyncData} className="gap-1.5 h-9">
            <RefreshCw className="h-4 w-4" />
            Sync ODL State
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Threats logged</span>
                <p className="text-3xl font-extrabold text-foreground">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl dark:bg-blue-900/20 dark:text-blue-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-muted-foreground gap-1">
              <Info className="h-3.5 w-3.5 text-blue-500" />
              <span>Real ODL failures + simulated threats</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Alerts</span>
                <p className="text-3xl font-extrabold text-red-500">{stats.active}</p>
              </div>
              <div className="p-3 bg-red-100 text-red-600 rounded-xl dark:bg-red-900/20 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-red-500 gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
              <span>Requires immediate review</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Critical Severity</span>
                <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">{stats.critical}</p>
              </div>
              <div className="p-3 bg-orange-100 text-orange-600 rounded-xl dark:bg-orange-900/20 dark:text-orange-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <span>Switches reporting isolated status</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Under Investigation</span>
                <p className="text-3xl font-extrabold text-amber-500">{stats.investigating}</p>
              </div>
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl dark:bg-amber-900/20 dark:text-amber-400">
                <Eye className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-muted-foreground gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>{stats.total - stats.active - stats.investigating} resolved or acknowledged</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Alert Frequency Trend
            </CardTitle>
            <CardDescription>
              Hourly breakdown of anomaly events over the last 6 hours
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                <XAxis dataKey="time" className="text-xs text-muted-foreground" />
                <YAxis className="text-xs text-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  labelClassName="text-sm font-semibold text-foreground"
                />
                <Area type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#criticalGrad)" name="Critical" />
                <Area type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#highGrad)" name="High" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Threat Distribution
            </CardTitle>
            <CardDescription>
              Events categorized by vector type
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] flex items-center justify-center relative">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">No anomalies logged</p>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-10">
              <span className="text-2xl font-bold">{stats.total}</span>
              <span className="text-[10px] uppercase text-muted-foreground">Total Alert Events</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List Filters & Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold">Threat Alerts Log</CardTitle>
              <CardDescription>Filtering {filteredAnomalies.length} of {anomalies.length} entries</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <Input
                placeholder="Search type, switch ID, description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-[260px] h-9"
              />

              {/* Severity Filter */}
              <Select value={severityFilter} onValueChange={(v) => { if (v) setSeverityFilter(v); }}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredAnomalies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] pl-6">Alert ID</TableHead>
                  <TableHead className="w-[140px]">Detection Time</TableHead>
                  <TableHead className="w-[90px]">Severity</TableHead>
                  <TableHead className="w-[110px]">Switch Target</TableHead>
                  <TableHead className="w-[200px]">Anomaly Vector</TableHead>
                  <TableHead>Detailed Context</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[130px] pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnomalies.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs font-semibold pl-6">{a.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.time}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] capitalize ${severityColors[a.severity]}`}>
                        {a.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs flex items-center gap-1 mt-2.5">
                      <Server className="h-3 w-3 text-muted-foreground" />
                      {a.nodeId}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{a.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate" title={a.description}>
                      {a.description}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${statusColors[a.status]}`}>
                        {a.status}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right space-x-1.5 whitespace-nowrap">
                      {a.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          onClick={() => handleUpdateStatus(a.id, 'investigating')}
                        >
                          Investigate
                        </Button>
                      )}
                      {a.status !== 'acknowledged' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                          onClick={() => handleUpdateStatus(a.id, 'acknowledged')}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {a.status === 'acknowledged' && (
                        <span className="text-xs text-muted-foreground italic pr-2">Resolved</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No anomalies found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Your switch network appears quiet. Try modifying the search keywords or filters to locate historical logs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
