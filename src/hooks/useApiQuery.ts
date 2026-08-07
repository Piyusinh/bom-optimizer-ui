import { useEffect, useState, useCallback } from 'react';

export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  options: { initialData?: T } = {}
) {
  const { initialData } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}
