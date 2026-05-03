import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { subscribeToPortfolioEvolution } from '@/services/portfolio.service';
import type { PortfolioEvolutionDocument } from '@/types/portfolio';

interface UsePortfolioEvolutionResult {
  data: PortfolioEvolutionDocument | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export function usePortfolioEvolution(userId: string): UsePortfolioEvolutionResult {
  const [data, setData] = useState<PortfolioEvolutionDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToPortfolioEvolution(
      db,
      userId,
      (snapshot) => {
        setData(snapshot);
        setLastUpdated(new Date());
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return { data, loading, error, lastUpdated };
}
