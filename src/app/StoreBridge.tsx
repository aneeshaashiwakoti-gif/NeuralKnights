import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribe } from '../mock/store';

/**
 * Connects the shared application state to TanStack Query. Any committed change refreshes
 * every cached query, so a change made in one module is reflected in all related modules.
 * The backend integration may push invalidations or rely on refetch.
 */
export function StoreBridge() {
  const queryClient = useQueryClient();
  useEffect(() => subscribe(() => void queryClient.invalidateQueries()), [queryClient]);
  return null;
}
