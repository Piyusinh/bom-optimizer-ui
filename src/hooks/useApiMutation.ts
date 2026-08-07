import { useState, useCallback } from 'react';

export function useApiMutation<TArgs, TResult = void>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  options: { onSuccess?: (result: TResult) => void; onError?: (err: unknown) => void } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (args: TArgs) => {
      setLoading(true);
      setError(null);
      try {
        const result = await mutationFn(args);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Action failed';
        setError(message);
        options.onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutationFn]
  );

  return { mutate, loading, error };
}
