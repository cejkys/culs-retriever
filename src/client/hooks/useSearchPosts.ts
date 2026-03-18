import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ArchiveHealthResponse,
  SearchPost,
  SearchPostsDebug,
  SearchPostsResponse,
} from '../../shared/types/api';

export const useSearchPosts = (initialQuery = 'ADHD', initialLimit = 1) => {
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState(initialQuery);
  const [lastLimit, setLastLimit] = useState(initialLimit);
  const [searchDebug, setSearchDebug] = useState<SearchPostsDebug | null>(null);
  const [databaseCheckLoading, setDatabaseCheckLoading] = useState(false);
  const [databaseDebug, setDatabaseDebug] = useState<Pick<
    SearchPostsDebug,
    'databaseStatus' | 'databaseMessage' | 'databaseCheckedAt' | 'databaseDurationMs'
  > | null>(null);

  const fetchPosts = useCallback(
    async (query: string, limit: number) => {
      setLoading(true);
      setError(null);
      console.info('[search-posts] request', { query, limit });
      try {
        const params = new URLSearchParams({
          query,
          limit: limit.toString(),
        });

        const res = await fetch(`/api/search-posts?${params.toString()}`);
        const text = await res.text();
        if (!res.ok) {
          console.error('[search-posts] upstream http error', {
            status: res.status,
            body: text.slice(0, 300),
          });
          try {
            const json = JSON.parse(text) as { message?: string };
            throw new Error(json.message ?? `HTTP ${res.status}`);
          } catch {
            throw new Error(`HTTP ${res.status}`);
          }
        }

        const data: SearchPostsResponse = JSON.parse(text);
        if (data.type !== 'searchPosts') throw new Error('Unexpected response');
        setPosts(data.posts);
        setLastQuery(data.query);
        setLastLimit(data.limit);
        setSearchDebug(data.debug ?? null);
        console.info('[search-posts] response', {
          requestId: data.debug?.requestId,
          source: data.debug?.source,
          upstreamStatus: data.debug?.upstreamStatus,
          upstreamCount: data.debug?.upstreamCount,
          matchedCount: data.debug?.matchedCount,
          fallbackCount: data.debug?.fallbackCount,
          archiveEnabled: data.debug?.archiveEnabled,
          archiveConfigSource: data.debug?.archiveConfigSource,
          archiveScannedCount: data.debug?.archiveScannedCount,
          archiveMatchedCount: data.debug?.archiveMatchedCount,
          archiveAddedCount: data.debug?.archiveAddedCount,
          archivedUpsertedCount: data.debug?.archivedUpsertedCount,
          archiveLogs: data.debug?.archiveLogs,
          durationMs: data.debug?.durationMs,
          posts: data.posts.length,
        });
      } catch (err) {
        console.error('Failed to load search posts', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSearchDebug(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchPosts(initialQuery, initialLimit);
  }, [fetchPosts, initialQuery, initialLimit]);

  const checkDatabaseConnection = useCallback(async () => {
    setDatabaseCheckLoading(true);
    try {
      const response = await fetch('/api/archive-health');
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 180)}`);
      }

      const data = JSON.parse(text) as ArchiveHealthResponse;
      if (data.type !== 'archiveHealth') {
        throw new Error('Unexpected response');
      }

      setDatabaseDebug({
        databaseStatus: data.status,
        databaseMessage: data.message,
        databaseCheckedAt: data.checkedAt,
        databaseDurationMs: data.durationMs,
      });
      console.info('[archive-health] response', data);
    } catch (err) {
      const fallbackMessage =
        err instanceof Error ? err.message : 'Unknown database connection error';
      setDatabaseDebug({
        databaseStatus: 'offline',
        databaseMessage: fallbackMessage,
        databaseCheckedAt: new Date().toISOString(),
      });
      console.error('[archive-health] failed', err);
    } finally {
      setDatabaseCheckLoading(false);
    }
  }, []);

  const debug = useMemo(() => {
    if (!searchDebug) return null;
    return databaseDebug ? { ...searchDebug, ...databaseDebug } : searchDebug;
  }, [databaseDebug, searchDebug]);

  return {
    posts,
    loading,
    error,
    search: fetchPosts,
    lastQuery,
    lastLimit,
    debug,
    checkDatabaseConnection,
    databaseCheckLoading,
  } as const;
};
