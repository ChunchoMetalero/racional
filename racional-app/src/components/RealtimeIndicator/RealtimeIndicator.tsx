import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RealtimeIndicatorProps {
  lastUpdated: Date | null;
}

function getTimeAgo(date: Date, nowMs: number): string {
  const secs = Math.floor((nowMs - date.getTime()) / 1000);
  if (secs < 5) return 'Ahora mismo';
  if (secs < 60) return `hace ${secs}s`;
  const mins = Math.floor(secs / 60);
  return `hace ${mins}m`;
}

export function RealtimeIndicator({ lastUpdated }: RealtimeIndicatorProps) {
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [lastUpdated]);

  const effectiveNow = lastUpdated ? Math.max(nowMs, lastUpdated.getTime()) : nowMs;
  const isStale = lastUpdated ? effectiveNow - lastUpdated.getTime() > 30_000 : false;
  const flash = lastUpdated ? effectiveNow - lastUpdated.getTime() < 800 : false;
  const timeAgo = lastUpdated ? getTimeAgo(lastUpdated, effectiveNow) : '';

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {!isStale && (
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              flash ? 'bg-emerald-400' : 'bg-emerald-500',
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full h-2.5 w-2.5',
            isStale ? 'bg-muted-foreground' : flash ? 'bg-emerald-400' : 'bg-emerald-500',
          )}
        />
      </span>

      <Badge variant="outline" className="text-xs font-medium gap-1">
        {isStale ? 'Reconectando…' : 'En vivo'}
      </Badge>

      {timeAgo && (
        <span className="text-xs text-muted-foreground hidden sm:block">
          Actualizado {timeAgo}
        </span>
      )}
    </div>
  );
}
