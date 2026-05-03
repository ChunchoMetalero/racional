import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { EvolutionPoint } from '@/types/portfolio';

interface MovementRow {
  date: Date;
  portfolioValue: number;
  contributions: number;
  dailyReturn: number;
  portfolioIndex: number;
}

interface MovementsTableProps {
  data: EvolutionPoint[];
}

function formatValue(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function ReturnCell({ pct }: { pct: number }) {
  const val = pct * 100;
  if (Math.abs(val) < 0.001) {
    return <span className="text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0.000%</span>;
  }
  const positive = val > 0;
  return (
    <span className={cn('flex items-center gap-0.5 font-medium tabular-nums', positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
      {positive ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0" /> : <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />}
      {val > 0 ? '+' : ''}{val.toFixed(3)}%
    </span>
  );
}

const columnHelper = createColumnHelper<MovementRow>();

export function MovementsTable({ data }: MovementsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);

  const rows: MovementRow[] = useMemo(() => {
    return data.map((point) => ({
      date: point.date.toDate(),
      portfolioValue: point.portfolioValue,
      contributions: point.contributions,
      dailyReturn: point.dailyReturn,
      portfolioIndex: point.portfolioIndex,
    }));
  }, [data]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('date', {
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Fecha <ChevronsUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ getValue }) => format(getValue(), 'd MMM yyyy', { locale: es }),
      }),
      columnHelper.accessor('portfolioValue', {
        header: 'Valor portafolio',
        cell: ({ getValue }) => <span className="font-medium tabular-nums">{formatValue(getValue())}</span>,
      }),
      columnHelper.accessor('contributions', {
        header: 'Aportes acum.',
        cell: ({ getValue }) => <span className="tabular-nums text-muted-foreground">{formatValue(getValue())}</span>,
      }),
      columnHelper.accessor('dailyReturn', {
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Retorno diario <ChevronsUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ getValue }) => <ReturnCell pct={getValue()} />,
      }),
      columnHelper.accessor('portfolioIndex', {
        header: 'Índice',
        cell: ({ getValue }) => <span className="tabular-nums text-muted-foreground">{getValue().toFixed(2)}</span>,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sortedRows = table.getRowModel().rows;

  return (
    <>
      {/* Mobile: card list */}
      <div className="sm:hidden divide-y divide-border">
        {sortedRows.map((row) => {
          const { date, portfolioValue, dailyReturn, portfolioIndex } = row.original;
          return (
            <div key={row.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {format(date, 'd MMM yyyy', { locale: es })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Índice: {portfolioIndex.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{formatValue(portfolioValue)}</p>
                <div className="flex justify-end mt-0.5">
                  <ReturnCell pct={dailyReturn} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: full table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-muted-foreground text-xs uppercase tracking-wide">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {sortedRows.map((row) => (
              <TableRow key={row.id} className="even:bg-muted/30 hover:bg-muted/50 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2.5 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
