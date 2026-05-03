import { memo, useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  format,
  parseISO,
  subDays,
  subMonths,
  subYears,
  startOfYear,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import type { ChartPoint } from '@/types/portfolio';

type RangeKey = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | 'MAX';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1D', label: '1D' },
  { key: '5D', label: '5D' },
  { key: '1M', label: '1M' },
  { key: '6M', label: '6M' },
  { key: 'YTD', label: 'YTD' },
  { key: '1Y', label: '1A' },
  { key: 'MAX', label: 'Total' },
];

interface PortfolioChartProps {
  data: ChartPoint[];
}

function formatAxisValue(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function filterByRange(data: ChartPoint[], range: RangeKey): ChartPoint[] {
  if (!data.length) return data;

  const lastDate = parseISO(data[data.length - 1].date);
  let cutoff: Date;

  switch (range) {
    case '1D': cutoff = subDays(lastDate, 1); break;
    case '5D': cutoff = subDays(lastDate, 5); break;
    case '1M': cutoff = subMonths(lastDate, 1); break;
    case '6M': cutoff = subMonths(lastDate, 6); break;
    case 'YTD': cutoff = startOfYear(lastDate); break;
    case '1Y': cutoff = subYears(lastDate, 1); break;
    case 'MAX': return data;
  }

  const filtered = data.filter((p) => parseISO(p.date) >= cutoff);
  return filtered.length ? filtered : data;
}

function getXAxisConfig(range: RangeKey, dataLength: number) {
  const tickFormatter = (v: string) => {
    try {
      const date = parseISO(v);
      if (range === '1D' || range === '5D' || range === '1M') return format(date, 'd MMM', { locale: es });
      return format(date, 'MMM', { locale: es });
    } catch {
      return v;
    }
  };

  const interval = Math.max(0, Math.floor(dataLength / 6) - 1);

  return { tickFormatter, interval };
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
  const [range, setRange] = useState<RangeKey>('1Y');

  const filtered = useMemo(() => filterByRange(data, range), [data, range]);
  const { tickFormatter, interval } = useMemo(
    () => getXAxisConfig(range, filtered.length),
    [range, filtered.length],
  );

  return (
    <div>
      <div className="flex items-center justify-end gap-0.5 px-2 mb-3">
        {RANGES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={[
              'px-2.5 py-1 text-xs font-medium rounded transition-colors',
              range === key
                ? 'bg-[color:var(--portfolio-line)]/15 text-[color:var(--portfolio-line)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-[220px] sm:h-[300px] lg:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              tickFormatter={tickFormatter}
              interval={interval}
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
    </div>
  );
});
