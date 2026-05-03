import { useMemo } from 'react';
import { DollarSign, TrendingUp, Wallet, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortfolioEvolution } from '@/hooks/usePortfolioEvolution';
import { LoadingState } from '@/components/LoadingState/LoadingState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { MetricCard } from '@/components/MetricCard/MetricCard';
import { RealtimeIndicator } from '@/components/RealtimeIndicator/RealtimeIndicator';
import { PortfolioChart } from '@/components/PortfolioChart/PortfolioChart';
import { MovementsTable } from '@/components/MovementsTable/MovementsTable';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import type { ChartPoint } from '@/types/portfolio';

function formatValue(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(3)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function Dashboard() {
  const { data, loading, error, lastUpdated } = usePortfolioEvolution('user1');

  const metrics = useMemo(() => {
    if (!data?.array?.length) return null;
    const arr = data.array;
    const last = arr[arr.length - 1];
    const first = arr[0];

    const currentValue = last.portfolioValue;
    const totalContributions = last.contributions;
    const initialContributions = first.contributions;
    const absolutePnl = currentValue - totalContributions;
    const totalReturn = totalContributions > 0
      ? ((currentValue - totalContributions) / totalContributions) * 100
      : 0;
    const portfolioIndex = last.portfolioIndex;
    const dailyReturn = last.dailyReturn * 100;
    const lastDate = last.date.toDate();

    const chartData: ChartPoint[] = arr.map((point) => ({
      date: point.date.toDate().toISOString().split('T')[0],
      value: point.portfolioValue,
    }));

    return {
      currentValue,
      totalContributions,
      initialContributions,
      absolutePnl,
      totalReturn,
      portfolioIndex,
      dailyReturn,
      lastDate,
      chartData,
    };
  }, [data]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!data || !metrics) return null;

  const { currentValue, totalContributions, absolutePnl, totalReturn, portfolioIndex, dailyReturn, lastDate, chartData } = metrics;
  const returnPositive = totalReturn >= 0;
  const pnlPositive = absolutePnl >= 0;
  const dailyPositive = dailyReturn >= 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8">

        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Portafolio · user1</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Mis Inversiones
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Última actualización: {format(lastDate, "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:mt-1">
            <RealtimeIndicator lastUpdated={lastUpdated} />
            <ThemeToggle />
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 items-stretch">
          <MetricCard
            label="Valor actual"
            value={formatValue(currentValue)}
            icon={DollarSign}
            sublabel="Valor de mercado"
          />
          <MetricCard
            label="Retorno total"
            value={`${returnPositive ? '+' : ''}${totalReturn.toFixed(2)}%`}
            icon={TrendingUp}
            change={`${returnPositive ? '+' : ''}${totalReturn.toFixed(2)}%`}
            changePositive={returnPositive}
            sublabel={`Aportes: ${formatValue(totalContributions)}`}
          />
          <MetricCard
            label="Ganancia / Pérdida"
            value={`${pnlPositive ? '+' : ''}${formatValue(absolutePnl)}`}
            icon={Activity}
            change={`${pnlPositive ? '+' : ''}${formatValue(Math.abs(absolutePnl))}`}
            changePositive={pnlPositive}
            sublabel="Valor vs aportes"
          />
          <MetricCard
            label="Retorno diario"
            value={`${dailyPositive ? '+' : ''}${dailyReturn.toFixed(3)}%`}
            icon={Wallet}
            change={`${dailyPositive ? '+' : ''}${dailyReturn.toFixed(3)}%`}
            changePositive={dailyPositive}
            sublabel={`Índice: ${portfolioIndex.toFixed(2)}`}
          />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Evolución del portafolio</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <PortfolioChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Historial de movimientos
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({data.array.length} registros)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="max-h-96 overflow-y-auto">
              <MovementsTable data={data.array} />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
