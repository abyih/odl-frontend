import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Server, Plug, Palette, Clock, Info, CheckCircle, Search } from 'lucide-react';
import { useThemeContext } from '@/contexts/theme-context';
import { useControllerStatus, useControllerModules } from '@/hooks/use-odl-queries';
import { ConnectionStatusBadge } from '@/components/connection-status';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, toggleTheme } = useThemeContext();
  const { data: statusData } = useControllerStatus();
  const { data: modulesData, isLoading: modulesLoading } = useControllerModules();
  const [moduleSearch, setModuleSearch] = useState('');

  // Form state loaded from env defaults
  const [controllerUrl, setControllerUrl] = useState(import.meta.env.VITE_ODL_API_URL || 'http://localhost:8181');
  const [username, setUsername] = useState(import.meta.env.VITE_ODL_USERNAME || 'admin');
  const [password, setPassword] = useState(import.meta.env.VITE_ODL_PASSWORD || 'admin');
  const [pollingInterval, setPollingInterval] = useState(String(import.meta.env.VITE_POLLING_INTERVAL || '5000'));

  const isConnected = statusData?.status === 'connected';

  const filteredModules = (
    modulesData?.modules?.module ||
    modulesData?.['ietf-yang-library:modules-state']?.module ||
    []
  ).filter(m =>
    !moduleSearch ||
    m.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    m.namespace.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  const handleSaveConnection = () => {
    toast.info(
      'Connection settings are configured via .env file. Update VITE_ODL_API_URL, VITE_ODL_USERNAME, and VITE_ODL_PASSWORD in your .env file and restart the dev server.',
      { duration: 8000 }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure controller connection and dashboard preferences
        </p>
      </div>

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-muted-foreground" />
            Controller Connection
          </CardTitle>
          <CardDescription>
            ODL RESTCONF API connection configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <ConnectionStatusBadge />
            {isConnected && statusData && (
              <span className="text-xs text-muted-foreground">
                Latency: {statusData.latencyMs}ms
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="controller-url">Controller URL</Label>
              <Input
                id="controller-url"
                value={controllerUrl}
                onChange={e => setControllerUrl(e.target.value)}
                placeholder="http://localhost:8181"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Configured via VITE_ODL_API_URL in .env
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="polling">Polling Interval (ms)</Label>
            <Input
              id="polling"
              type="number"
              min="1000"
              max="60000"
              step="1000"
              value={pollingInterval}
              onChange={e => setPollingInterval(e.target.value)}
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              How often the dashboard refreshes data from the controller
            </p>
          </div>

          <Button onClick={handleSaveConnection}>
            Save Connection Settings
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the dashboard look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </CardContent>
      </Card>

      {/* Controller Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            Controller Modules
          </CardTitle>
          <CardDescription>
            Installed ODL features and YANG modules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search modules..."
              className="pl-9"
              value={moduleSearch}
              onChange={e => setModuleSearch(e.target.value)}
            />
          </div>

          {modulesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredModules.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module Name</TableHead>
                      <TableHead>Revision</TableHead>
                      <TableHead>Namespace</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModules.map((mod, i) => (
                      <TableRow key={`${mod.name}-${mod.revision}-${i}`}>
                        <TableCell className="font-mono text-xs font-medium">{mod.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{mod.revision}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                          {mod.namespace}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <Server className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {moduleSearch ? 'No modules match your search' : 'Could not load modules'}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Ensure the controller is running and accessible
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Environment
          </CardTitle>
          <CardDescription>Current environment configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 font-mono text-xs space-y-1.5">
            <p><span className="text-muted-foreground">VITE_ODL_API_URL=</span>{import.meta.env.VITE_ODL_API_URL || 'not set'}</p>
            <p><span className="text-muted-foreground">VITE_ODL_USERNAME=</span>{import.meta.env.VITE_ODL_USERNAME || 'not set'}</p>
            <p><span className="text-muted-foreground">VITE_ODL_PASSWORD=</span>{'•'.repeat((import.meta.env.VITE_ODL_PASSWORD || '').length) || 'not set'}</p>
            <p><span className="text-muted-foreground">VITE_POLLING_INTERVAL=</span>{import.meta.env.VITE_POLLING_INTERVAL || 'not set'}</p>
            <p><span className="text-muted-foreground">MODE=</span>{import.meta.env.MODE}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
