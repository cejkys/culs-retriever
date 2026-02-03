import { navigateTo } from '@devvit/web/client';
import { FormEvent, useState } from 'react';
import { useSearchPosts } from '../hooks/useSearchPosts';

const formatAge = (isoDate: string) => {
  const deltaMs = Date.now() - new Date(isoDate).getTime();
  if (!Number.isFinite(deltaMs)) return '';
  const minutes = Math.max(0, Math.floor(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export const App = () => {
  const [queryInput, setQueryInput] = useState('ADHD');
  const [limitInput, setLimitInput] = useState(12);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const { posts, loading, error, search, lastQuery, lastLimit } = useSearchPosts('ADHD', 12);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const safeLimit = Math.min(Math.max(Number(limitInput) || 12, 1), 50);
    setLimitInput(safeLimit);
    void search(queryInput, safeLimit);
  };

  const handleReset = () => {
    setQueryInput('ADHD');
    setLimitInput(12);
    setExpandedIds({});
    void search('ADHD', 12);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const previewText = (text?: string) => {
    if (!text) return 'No selftext available.';
    return text.length > 220 ? `${text.slice(0, 220)}…` : text;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-amber-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#d93900]">
              Reddit API Demo
            </p>
            <h1 className="text-3xl sm:text-4xl font-black leading-tight">Lucene-powered search</h1>
            <p className="text-gray-600 max-w-2xl">
              Enter any Apache Lucene syntax query (e.g. <code>title:&quot;adhd&quot; AND
              (therapy OR medication)</code>) and choose how many results to retrieve. Results are
              fetched server-side and rendered below in a table; full text is preloaded and revealed
              when you click &quot;View more&quot;.
            </p>
          </div>
        </header>

        <form
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-800" htmlFor="lucene-query">
              Lucene query
            </label>
            <input
              id="lucene-query"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#d93900]"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder='Example: title:"adhd" AND (therapy OR medication)'
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              Results:
              <input
                type="number"
                min={1}
                max={50}
                className="w-24 rounded-xl border border-gray-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#d93900]"
                value={limitInput}
                onChange={(e) => setLimitInput(Number(e.target.value))}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-[#d93900] text-white text-sm font-semibold shadow-sm hover:bg-[#b92d00] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Searching…' : 'Search'}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold hover:border-gray-300 shadow-sm"
                onClick={handleReset}
              >
                Reset to ADHD
              </button>
            </div>
            <div className="text-xs text-gray-600 ml-auto">
              Showing {posts.length} of requested {lastLimit} for query: “{lastQuery}”
            </div>
          </div>
        </form>

        <main className="space-y-4">
          {error && (
            <div className="rounded-xl border border-[#d93900]/30 bg-[#fff6f3] px-4 py-3 text-[#7a1e00] flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Couldn&apos;t reach Reddit search.</p>
                <p className="text-sm text-[#7a1e00]/80">{error}</p>
              </div>
              <button
                className="text-sm font-semibold underline underline-offset-4"
                onClick={() => void search(queryInput, limitInput)}
              >
                Try again
              </button>
            </div>
          )}

          {loading && !error && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 shadow-sm text-sm text-gray-600">
              Searching Reddit for ADHD posts…
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 shadow-sm text-sm text-gray-600">
              No posts were found for this query.
            </div>
          )}

          {posts.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-4 py-3 w-[40%]">Title & preview</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Comments</th>
                      <th className="px-4 py-3">Subreddit</th>
                      <th className="px-4 py-3">Age</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => {
                      const expanded = !!expandedIds[post.id];
                      return (
                        <tr key={post.id} className="border-t border-gray-100 align-top">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-gray-900">{post.title}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              u/{post.author} • r/{post.subreddit}
                            </div>
                            <div className="mt-3 text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                              {expanded ? post.selftext || 'No selftext available.' : previewText(post.selftext)}
                            </div>
                            {post.thumbnail && (
                              <div className="mt-3 w-full max-w-xs overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                                <img
                                  src={post.thumbnail}
                                  alt=""
                                  className="h-28 w-full object-cover"
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-800">
                              ▲ {post.score}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-800">{post.comments}</td>
                          <td className="px-4 py-4 text-gray-700">r/{post.subreddit}</td>
                          <td className="px-4 py-4 text-gray-600">{formatAge(post.createdAt)} ago</td>
                          <td className="px-4 py-4 text-right space-y-2">
                            <button
                              className="text-sm font-semibold text-[#d93900] underline underline-offset-4"
                              onClick={() => toggleExpand(post.id)}
                            >
                              {expanded ? 'Hide' : 'View more'}
                            </button>
                            <div>
                              <button
                                className="text-sm text-gray-700 font-semibold underline underline-offset-4"
                                onClick={() => navigateTo(post.permalink)}
                              >
                                Open on Reddit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
