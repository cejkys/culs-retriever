import { useCallback, useEffect, useState } from 'react';
import type { SearchPost, SearchPostsResponse } from '../../shared/types/api';

export const useSearchPosts = (initialQuery = 'ADHD', initialLimit = 12) => {
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState(initialQuery);
  const [lastLimit, setLastLimit] = useState(initialLimit);

  const fetchPosts = useCallback(
    async (query: string, limit: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          query,
          limit: limit.toString(),
        });

        const res = await fetch(`/api/search-posts?${params.toString()}`);
        const text = await res.text();
        if (!res.ok) {
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
      } catch (err) {
        console.error('Failed to load search posts', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchPosts(initialQuery, initialLimit);
  }, [fetchPosts, initialQuery, initialLimit]);

  return { posts, loading, error, search: fetchPosts, lastQuery, lastLimit } as const;
};
