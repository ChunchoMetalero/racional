import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changePositive?: boolean;
  sublabel?: string;
}

export function MetricCard({ label, value, icon: Icon, change, changePositive, sublabel }: MetricCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 space-y-0 sm:pt-4 sm:px-4 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{label}</CardTitle>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0 ml-1" />
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="text-lg sm:text-2xl font-bold text-foreground">{value}</div>
        {(change !== undefined || sublabel) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {change !== undefined && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs px-1.5 py-0 font-medium',
                  changePositive
                    ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950'
                    : 'text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950',
                )}
              >
                {changePositive ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {change}
              </Badge>
            )}
            {sublabel && (
              <p className="text-xs text-muted-foreground hidden sm:block">{sublabel}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
