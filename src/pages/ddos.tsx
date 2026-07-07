import { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  Zap,
  Target,
  Flame,
  ShieldCheck,
  Shield,
  Activity,
  UserX,
  Settings,
  Info,
  Play,
  Pause,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { toast } from 'sonner';

// Struct definitions
interface TargetHost {
  ip: string;
  trafficRate: number; // Mpps
  type: string;
  ports: string;
  status: 'critical' | 'mitigated' | 'monitoring';
}

interface AttackerSource {
  ip: string;
  location: string;
  trafficRate: number; // Mpps
  percentScore: number;
}

interface TrafficPoint {
  time: string;
  legitimate: number;
  malicious: number;
}

// Initial records
const INITIAL_TARGETS: TargetHost[] = [
  { ip: '10.0.0.2', trafficRate: 3.4, type: 'UDP Flood', ports: '80, 443', status: 'critical' },
  { ip: '10.0.0.15', trafficRate: 1.8, type: 'TCP SYN Flood', ports: '22', status: 'monitoring' },
  { ip: '10.0.0.8', trafficRate: 0.1, type: 'DNS Amplification', ports: '53', status: 'mitigated' },
];

const INITIAL_ATTACKERS: AttackerSource[] = [
  { ip: '192.168.42.110', location: 'AS43928 (External)', trafficRate: 2.1, percentScore: 99 },
  { ip: '172.16.55.8', location: 'AS1102 (Internal Subnet)', trafficRate: 1.3, percentScore: 95 },
  { ip: '192.168.42.14', location: 'AS43928 (External)', trafficRate: 1.1, percentScore: 92 },
  { ip: '84.22.109.4', location: 'AS8072 (Spoofed IP)', trafficRate: 0.7, percentScore: 88 },
];

const vectorColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

const vectorData = [
  { name: 'UDP Flood', value: 55, fill: vectorColors[0] },
  { name: 'TCP SYN Flood', value: 30, fill: vectorColors[1] },
  { name: 'DNS Amplification', value: 15, fill: vectorColors[2] },
];

export default function DdosPage() {
  const [isLive, setIsLive] = useState<boolean>(true);
  const [synFloodProtection, setSynFloodProtection] = useState<boolean>(true);
  const [dnsAmpProtection, setDnsAmpProtection] = useState<boolean>(false);
  const [udpRateLimiting, setUdpRateLimiting] = useState<boolean>(true);
  const [udpThreshold, setUdpThreshold] = useState<string>('50000');

  const [targets, setTargets] = useState<TargetHost[]>(INITIAL_TARGETS);
  const [attackers, setAttackers] = useState<AttackerSource[]>(INITIAL_ATTACKERS);
  const [trafficData, setTrafficData] = useState<TrafficPoint[]>([]);

  // Generate historical traffic rates
  useEffect(() => {
    const data: TrafficPoint[] = [];
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const timeStr = new Date(now - i * 5000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      data.push({
        time: timeStr,
        legitimate: Math.floor(Math.random() * 50 + 200), // pps
        malicious: Math.floor(Math.random() * 400 + 600), // pps
      });
    }
    setTrafficData(data);
  }, []);

  // Live traffic updating simulation
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setTrafficData(prev => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const isCurrentlyAttacked = targets.some(t => t.status === 'critical');
        const nextMalicious = isCurrentlyAttacked
          ? Math.floor(Math.random() * 300 + 700)
          : Math.floor(Math.random() * 20 + 5);
        const nextLegit = Math.floor(Math.random() * 60 + 220);

        const updated = [...prev.slice(1), { time: nextTime, legitimate: nextLegit, malicious: nextMalicious }];
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive, targets]);

  // Compute metrics
  const summaryMetrics = useMemo(() => {
    const isAttacked = targets.some(t => t.status === 'critical');
    const peakRate = isAttacked
      ? (targets.reduce((acc, curr) => acc + curr.trafficRate, 0)).toFixed(1)
      : '0.2';
    const activeThreatsCount = targets.filter(t => t.status === 'critical').length;
    return { isAttacked, peakRate, activeThreatsCount };
  }, [targets]);

  const handleMitigateHost = (ip: string) => {
    setTargets(prev =>
      prev.map(t => (t.ip === ip ? { ...t, status: 'mitigated', trafficRate: 0.1 } : t))
    );
    // Lower attacker rates correspondingly for simulation
    setAttackers(prev =>
      prev.map(a => ({
        ...a,
        trafficRate: Math.max(0.1, +(a.trafficRate * 0.15).toFixed(2)),
      }))
    );
    toast.success(`DDoS Mitigation rules triggered for ${ip}`, {
      description: 'Traffic scrubbers configured; auto flow table throttling applied.',
    });
  };

  const handleSimulateAttack = () => {
    // Bring host state to critical/attacked
    setTargets([
      { ip: '10.0.0.2', trafficRate: 4.8, type: 'UDP Flood', ports: '80, 443', status: 'critical' },
      { ip: '10.0.0.15', trafficRate: 2.5, type: 'TCP SYN Flood', ports: '22', status: 'critical' },
      { ip: '10.0.0.8', trafficRate: 0.1, type: 'DNS Amplification', ports: '53', status: 'mitigated' },
    ]);
    setAttackers([
      { ip: '192.168.42.110', location: 'AS43928 (External)', trafficRate: 3.8, percentScore: 99 },
      { ip: '172.16.55.8', location: 'AS1102 (Internal Subnet)', trafficRate: 2.2, percentScore: 97 },
      { ip: '192.168.42.14', location: 'AS43928 (External)', trafficRate: 1.8, percentScore: 94 },
      { ip: '84.22.109.4', location: 'AS8072 (Spoofed IP)', trafficRate: 1.5, percentScore: 89 },
    ]);
    toast.error('ALERT: Multi-Vector DDoS Attack Simulated!', {
      description: 'Incoming volume exceeding 7.3 Mpps targeting 10.0.0.2 & 10.0.0.15.',
      duration: 6000,
    });
  };

  const handleResetSim = () => {
    setTargets([
      { ip: '10.0.0.2', trafficRate: 0.1, type: 'UDP Flood', ports: '80, 443', status: 'monitoring' },
      { ip: '10.0.0.15', trafficRate: 0.05, type: 'TCP SYN Flood', ports: '22', status: 'monitoring' },
      { ip: '10.0.0.8', trafficRate: 0.01, type: 'DNS Amplification', ports: '53', status: 'monitoring' },
    ]);
    setAttackers([
      { ip: '192.168.42.110', location: 'AS43928 (External)', trafficRate: 0.05, percentScore: 10 },
      { ip: '172.16.55.8', location: 'AS1102 (Internal)', trafficRate: 0.02, percentScore: 5 },
      { ip: '192.168.42.14', location: 'AS43928 (External)', trafficRate: 0.02, percentScore: 8 },
      { ip: '84.22.109.4', location: 'AS8072 (Spoofed IP)', trafficRate: 0.01, percentScore: 3 },
    ]);
    toast.success('DDoS Simulator reset to clean baseline.');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DDoS Threat Analysis</h1>
          <p className="text-muted-foreground">
            Real-time analytics on volumetric packet floods, spoofed traffic sources, and network scrubbing status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summaryMetrics.isAttacked ? (
            <Button onClick={handleResetSim} variant="outline" className="border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-1">
              <ShieldCheck className="h-4 w-4" />
              Reset to Baseline
            </Button>
          ) : (
            <Button onClick={handleSimulateAttack} variant="destructive" className="gap-1">
              <Flame className="h-4 w-4" />
              Simulate DDoS Attack
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsLive(!isLive)}
            title={isLive ? 'Pause Realtime Update' : 'Resume Realtime Update'}
          >
            {isLive ? <Pause className="h-4 w-4 text-amber-500" /> : <Play className="h-4 w-4 text-emerald-500" />}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attack Status</span>
                <p className={`text-xl font-extrabold flex items-center gap-1.5 ${summaryMetrics.isAttacked ? 'text-red-500' : 'text-emerald-500'}`}>
                  {summaryMetrics.isAttacked ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Under Attack
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Protected
                    </>
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${summaryMetrics.isAttacked ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                {summaryMetrics.isAttacked ? <Flame className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <span>{summaryMetrics.activeThreatsCount} internal host targets active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aggregate Traffic Rate</span>
                <p className="text-3xl font-extrabold text-foreground">{summaryMetrics.peakRate} Mpps</p>
              </div>
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl dark:bg-rose-900/20 dark:text-rose-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <span>Packets processed in control pipeline</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Targeted Victims</span>
                <p className="text-3xl font-extrabold text-foreground">{targets.filter(t => t.status !== 'mitigated').length}</p>
              </div>
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl dark:bg-amber-900/20 dark:text-amber-400">
                <Target className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
              <span>Primary focus IP:</span>
              <span className="font-mono font-semibold text-foreground">10.0.0.2</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mitigated Threats</span>
                <p className="text-3xl font-extrabold text-emerald-500">{targets.filter(t => t.status === 'mitigated').length}</p>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl dark:bg-emerald-900/20 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <span>Active flow filtering entries in ODL</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Vectors */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Live Ingress Traffic Volume (pps)
            </CardTitle>
            <CardDescription>
              Real-time monitoring of legitimate requests vs. suspicious DDoS anomalies.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {trafficData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="legitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="maliciousGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                  <XAxis dataKey="time" className="text-[10px] text-muted-foreground" />
                  <YAxis className="text-[10px] text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="legitimate" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#legitGrad)" name="Legitimate Traffic" />
                  <Area type="monotone" dataKey="malicious" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#maliciousGrad)" name="DDoS Flood Traffic" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground">Gathering statistics...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-500" />
              Attack Vectors Breakdown
            </CardTitle>
            <CardDescription>
              Volume share of current threats
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {vectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
              <span className="text-2xl font-bold">3</span>
              <span className="text-[10px] uppercase text-muted-foreground">Vectors Identified</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target & Attacker Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Targets Table */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <Target className="h-4 w-4 text-red-500" />
              Internal Targets (Victims)
            </CardTitle>
            <CardDescription>Targeted subnets/IPs and their active threat rate</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Destination IP</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Port(s)</TableHead>
                  <TableHead>Flood Volume</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Scrub Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map(t => (
                  <TableRow key={t.ip}>
                    <TableCell className="font-mono text-xs font-semibold pl-6">{t.ip}</TableCell>
                    <TableCell className="text-xs font-medium">{t.type}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.ports}</TableCell>
                    <TableCell className="text-sm font-semibold">{t.trafficRate} Mpps</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.status === 'critical'
                            ? 'destructive'
                            : t.status === 'mitigated'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {t.status === 'critical' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                          onClick={() => handleMitigateHost(t.ip)}
                        >
                          Enable Scrubbing
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inactive / Protected</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Attacker Table */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <UserX className="h-4 w-4 text-orange-500" />
              Suspected Attack Sources (Attakers)
            </CardTitle>
            <CardDescription>Top source IPs causing traffic anomalies</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Source IP Address</TableHead>
                  <TableHead>Ingress Domain/AS</TableHead>
                  <TableHead>Flood Rate</TableHead>
                  <TableHead className="pr-6 text-right">Confidence Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attackers.map(a => (
                  <TableRow key={a.ip}>
                    <TableCell className="font-mono text-xs font-semibold pl-6">{a.ip}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.location}</TableCell>
                    <TableCell className="text-sm font-semibold">{a.trafficRate} Mpps</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Badge variant="outline" className="text-[10px] text-orange-600 bg-orange-50 border-orange-200/50 dark:bg-orange-950/20 dark:border-orange-900/50">
                        {a.percentScore}% Match
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Defensive Threshold Settings Panel */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Automatic Mitigation Policies & Limits
          </CardTitle>
          <CardDescription>
            Configure thresholds that trigger alarms when volumetric anomalies cross set bounds.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-card/50">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TCP SYN Protection</span>
                <p className="text-xs text-muted-foreground">Intercept flood anomalies</p>
              </div>
              <Switch checked={synFloodProtection} onCheckedChange={setSynFloodProtection} />
            </div>

            <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-card/50">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">DNS Amplification Guard</span>
                <p className="text-xs text-muted-foreground">Throttles high port 53 responses</p>
              </div>
              <Switch checked={dnsAmpProtection} onCheckedChange={setDnsAmpProtection} />
            </div>

            <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-card/50">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">UDP Flood Rate Limiting</span>
                <p className="text-xs text-muted-foreground">Throttle unmatched packet-ins</p>
              </div>
              <Switch checked={udpRateLimiting} onCheckedChange={setUdpRateLimiting} />
            </div>

            <div className="space-y-2 border p-4 rounded-lg bg-card/50">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">UDP Trigger Limit (pps)</span>
              <Input
                type="number"
                value={udpThreshold}
                onChange={e => setUdpThreshold(e.target.value)}
                className="h-8 max-w-full text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 text-xs text-muted-foreground bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-950/50 p-3 rounded-lg">
            <Info className="h-4 w-4 text-blue-500 shrink-0" />
            <p>
              Volumetric triggers run locally in the controller processing loop. When metrics cross set thresholds, warning alerts are logged automatically in the Anomalies Log.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
