import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  Server,
  GitBranch,
  BarChart3,
  Settings,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ConnectionStatus } from '@/components/connection-status';

const managementItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Topology', url: '/topology', icon: Network },
  { title: 'Nodes', url: '/nodes', icon: Server },
  { title: 'Flows', url: '/flows', icon: GitBranch },
  { title: 'Statistics', url: '/statistics', icon: BarChart3 },
];

const securityItems = [
  { title: 'Anomalies', url: '/anomalies', icon: ShieldAlert },
  { title: 'DDoS Analysis', url: '/ddos', icon: Flame },
];

const systemItems = [
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  const renderMenuItems = (items: typeof managementItems) => {
    return items.map((item) => {
      const isActive = item.url === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.url);
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            render={<Link to={item.url} />}
            isActive={isActive}
            tooltip={item.title}
          >
            <item.icon className="size-4" />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link to="/" />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Network className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">OpenDayLight</span>
                <span className="truncate text-xs text-muted-foreground">SDN Controller</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Management Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(managementItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Security Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Security</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(securityItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System/Settings Group */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(systemItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="cursor-default">
              <ConnectionStatus />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
