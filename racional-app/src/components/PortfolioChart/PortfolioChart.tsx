import { memo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import type { ChartPoint } from '@/types/portfolio';

interface PortfolioChartProps {
  data: ChartPoint[];
}

function formatAxisValue(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: ChartPoint }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  let formattedDate = label;
  try {
    formattedDate = format(parseISO(label), "d 'de' MMMM, yyyy", { locale: es });
  } catch {
    // keep label as-is
  }

  const value = payload[0].value;
  const formatted = value >= 1_000_000
    ? `$${(value / 1_000_000).toFixed(3)}M`
    : `$${value.toLocaleString('es-CL')}`;

  return (
    <Card className="shadow-lg border">
      <CardContent className="px-3 py-2">
        <p className="text-xs text-muted-foreground mb-1">{formattedDate}</p>
        <p className="text-sm font-semibold text-foreground">{formatted}</p>
      </CardContent>
    </Card>
  );
}

export const PortfolioChart = memo(function PortfolioChart({ data }: PortfolioChartProps) {
  return (
    <div className="h-[220px] sm:h-[300px] lg:h-[340px]">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--portfolio-line)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--portfolio-line)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickFormatter={(v: string) => {
            try {
              return format(parseISO(v), 'MMM', { locale: es });
            } catch {
              return v;
            }
          }}
          interval={29}
        />

        <YAxis
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickFormatter={formatAxisValue}
          width={64}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
        />

        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--portfolio-line)"
          strokeWidth={2.5}
          fill="url(#portfolioGradient)"
          animationDuration={300}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--portfolio-line)', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
});
