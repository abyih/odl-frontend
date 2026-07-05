import { Wifi, WifiOff } from 'lucide-react';
import { useControllerStatus } from '@/hooks/use-odl-queries';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const { data, isLoading } = useControllerStatus();

  const isConnected = data?.status === 'connected';

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-emerald-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
            isLoading && "animate-pulse bg-amber-400",
            !isLoading && isConnected && "bg-emerald-500",
            !isLoading && !isConnected && "bg-red-500"
          )}
        />
      </div>
      <span className="text-xs font-medium truncate">
        {isLoading
          ? 'Connecting...'
          : isConnected
            ? `Online (${data.latencyMs}ms)`
            : 'Offline'}
      </span>
    </div>
  );
}

export function ConnectionStatusBadge() {
  const { data, isLoading } = useControllerStatus();
  const isConnected = data?.status === 'connected';

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
      isLoading && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      !isLoading && isConnected && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      !isLoading && !isConnected && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    )}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        isLoading && "animate-pulse bg-amber-500",
        !isLoading && isConnected && "bg-emerald-500",
        !isLoading && !isConnected && "bg-red-500"
      )} />
      {isLoading ? 'Connecting' : isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
