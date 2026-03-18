import { navigateTo } from '@devvit/web/client';
import { FormEvent, useMemo, useState } from 'react';
import type { ArchiveHealthStatus } from '../../shared/types/api';
import { DisplayControls } from '../components/DisplayControls';
import { useSearchPosts } from '../hooks/useSearchPosts';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../hooks/useTheme';

const formatAge = (
  isoDate: string,
  units: {
    minute: string;
    hour: string;
    day: string;
  }
) => {
  const deltaMs = Date.now() - new Date(isoDate).getTime();
  if (!Number.isFinite(deltaMs)) return '';
  const minutes = Math.max(0, Math.floor(deltaMs / 60000));
  if (minutes < 60) return `${minutes}${units.minute}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}${units.hour}`;
  const days = Math.floor(hours / 24);
  return `${days}${units.day}`;
};

const normalizeLimit = (value: number) => Math.min(Math.max(Number(value) || 1, 1), 50);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="h-3.5 w-3.5"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5 9.5 17 19 7.5" />
  </svg>
);

const DotIcon = () => <span className="inline-block h-2 w-2 rounded-full bg-current" />;

const statusBadgeClassName = (status: ArchiveHealthStatus) => {
  switch (status) {
    case 'online':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200';
    case 'offline':
      return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200';
    case 'disabled':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200';
  }
};

const formatCheckedAt = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
};

export const App = () => {
  const [queryInput, setQueryInput] = useState('ADHD');
  const [limitInput, setLimitInput] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [showQueryManual, setShowQueryManual] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const {
    posts,
    loading,
    error,
    search,
    lastQuery,
    lastLimit,
    debug,
    checkDatabaseConnection,
    databaseCheckLoading,
  } = useSearchPosts('ADHD', 1);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const safeLimit = normalizeLimit(limitInput);
    setLimitInput(safeLimit);
    void search(queryInput, safeLimit);
  };

  const retrySearch = () => {
    const safeLimit = normalizeLimit(limitInput);
    setLimitInput(safeLimit);
    void search(queryInput, safeLimit);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const previewText = (text?: string) => {
    if (!text) return t.game.noSelftext;
    return text.length > 220 ? `${text.slice(0, 220)}…` : text;
  };

  const sourceLabel = useMemo(
    () => (debug ? t.game.debug.sourceValues[debug.source] : undefined),
    [debug, t.game.debug.sourceValues]
  );
  const archiveConfigSourceLabel = useMemo(
    () =>
      debug?.archiveConfigSource
        ? t.game.debug.archiveConfigSourceValues[debug.archiveConfigSource]
        : undefined,
    [debug?.archiveConfigSource, t.game.debug.archiveConfigSourceValues]
  );
  const databaseStatusLabel = useMemo(
    () => (debug?.databaseStatus ? t.game.debug.statusValues[debug.databaseStatus] : undefined),
    [debug?.databaseStatus, t.game.debug.statusValues]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-amber-50 text-gray-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#d93900]">
              {t.game.brand}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black leading-tight">{t.game.title}</h1>
            <p className="text-gray-600 max-w-2xl dark:text-slate-300">{t.game.intro}</p>
          </div>
          <DisplayControls
            theme={theme}
            onToggleTheme={toggleTheme}
            language={language}
            onLanguageChange={setLanguage}
            labels={t.common}
            className="self-start sm:self-auto"
          />
        </header>

        <form
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4 dark:bg-slate-900 dark:border-slate-700"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-semibold text-gray-800 dark:text-slate-200"
              htmlFor="lucene-query"
            >
              {t.game.queryLabel}
            </label>
            <input
              id="lucene-query"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#d93900] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder={t.game.queryPlaceholder}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
              {t.game.resultsLabel}:
              <input
                type="number"
                min={1}
                max={50}
                className="w-24 rounded-xl border border-gray-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#d93900] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
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
                {loading ? t.game.searching : t.game.search}
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold hover:border-gray-300 shadow-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500"
                onClick={() => setShowQueryManual((prev) => !prev)}
              >
                {showQueryManual ? t.game.hideQueryManual : t.game.showQueryManual}
              </button>
            </div>
            <div className="text-xs text-gray-600 ml-auto dark:text-slate-300">
              {t.game.showingSummary(posts.length, lastLimit, lastQuery)}
            </div>
          </div>
          {showQueryManual && (
            <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 text-sm text-gray-700 shadow-inner dark:border-amber-500/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/70 pb-3 dark:border-slate-700">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#d93900]">
                    {t.game.manual.label}
                  </p>
                  <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                    {t.game.manual.title}
                  </h3>
                </div>
                <div className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {t.game.manual.badge}
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    {t.game.manual.coreTitle}
                  </div>
                  <div className="mt-3 space-y-2">
                    {t.game.manual.coreExamples.map((example) => (
                      <div
                        key={example.query}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <code className="block text-[12px] font-semibold text-[#d93900] dark:text-orange-300">
                          {example.query}
                        </code>
                        <div className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                          {example.meaning}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    {t.game.manual.advancedTitle}
                  </div>
                  <div className="mt-3 space-y-2">
                    {t.game.manual.advancedExamples.map((example) => (
                      <div
                        key={example.query}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <code className="block text-[12px] font-semibold text-indigo-700 dark:text-indigo-300">
                          {example.query}
                        </code>
                        <div className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                          {example.meaning}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-4 rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  {t.game.manual.syntaxTitle}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.game.manual.syntaxCheatsheet.map((token) => (
                    <code
                      key={token}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {token}
                    </code>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-600 dark:text-slate-300">{t.game.manual.note}</p>
            </div>
          )}
        </form>

        <main className="space-y-4">
          {error && (
            <div className="rounded-xl border border-[#d93900]/30 bg-[#fff6f3] px-4 py-3 text-[#7a1e00] flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{t.game.errorTitle}</p>
                <p className="text-sm text-[#7a1e00]/80">{error}</p>
              </div>
              <button
                className="text-sm font-semibold underline underline-offset-4"
                onClick={retrySearch}
              >
                {t.game.retry}
              </button>
            </div>
          )}

          {loading && !error && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 shadow-sm text-sm text-gray-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
              {t.game.loading}
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 shadow-sm text-sm text-gray-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
              {t.game.noPosts}
            </div>
          )}

          {debug && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-xs text-gray-600 shadow-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="font-semibold text-gray-800 dark:text-slate-100">
                  {t.game.debug.title}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                  onClick={() => void checkDatabaseConnection()}
                  disabled={databaseCheckLoading}
                >
                  {databaseCheckLoading ? t.game.checkingDatabase : t.game.checkDatabase}
                </button>
              </div>
              <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {debug.appName && (
                  <div>
                    {t.game.debug.appName}: {debug.appName}
                  </div>
                )}
                {debug.appVersion && (
                  <div>
                    {t.game.debug.appVersion}: {debug.appVersion}
                  </div>
                )}
                {typeof debug.archiveEnabled === 'boolean' && (
                  <div>
                    {t.game.debug.archiveEnabled}:{' '}
                    {debug.archiveEnabled ? t.common.yes : t.common.no}
                  </div>
                )}
                {archiveConfigSourceLabel && (
                  <div>
                    {t.game.debug.archiveConfigSource}: {archiveConfigSourceLabel}
                  </div>
                )}
                {databaseStatusLabel && debug.databaseStatus && (
                  <div>
                    {t.game.debug.databaseStatus}:{' '}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${statusBadgeClassName(
                        debug.databaseStatus
                      )}`}
                    >
                      {debug.databaseStatus === 'online' ? <CheckIcon /> : <DotIcon />}
                      {databaseStatusLabel}
                    </span>
                  </div>
                )}
                {debug.databaseMessage && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    {t.game.debug.databaseMessage}: {debug.databaseMessage}
                  </div>
                )}
                {debug.databaseCheckedAt && (
                  <div>
                    {t.game.debug.databaseCheckedAt}: {formatCheckedAt(debug.databaseCheckedAt)}
                  </div>
                )}
                {typeof debug.databaseDurationMs === 'number' && (
                  <div>
                    {t.game.debug.databaseCheckDuration}: {debug.databaseDurationMs}{' '}
                    {t.game.debug.milliseconds}
                  </div>
                )}
                <div>
                  {t.game.debug.requestId}: {debug.requestId}
                </div>
                <div>
                  {t.game.debug.source}: {sourceLabel}
                </div>
                <div>
                  {t.game.debug.duration}: {debug.durationMs} {t.game.debug.milliseconds}
                </div>
                <div>
                  {t.game.debug.receivedQuery}: “{debug.receivedQuery}”
                </div>
                <div>
                  {t.game.debug.normalizedQuery}: “{debug.normalizedQuery}”
                </div>
                <div>
                  {t.game.debug.limit}: {debug.limit}
                </div>
                {typeof debug.upstreamStatus === 'number' && (
                  <div>
                    {t.game.debug.upstreamStatus}: {debug.upstreamStatus}
                  </div>
                )}
                {typeof debug.upstreamCount === 'number' && (
                  <div>
                    {t.game.debug.upstreamCount}: {debug.upstreamCount}
                  </div>
                )}
                {typeof debug.matchedCount === 'number' && (
                  <div>
                    {t.game.debug.matchedLive}: {debug.matchedCount}
                  </div>
                )}
                {typeof debug.fallbackCount === 'number' && (
                  <div>
                    {t.game.debug.fallbackCount}: {debug.fallbackCount}
                  </div>
                )}
                {typeof debug.archiveScannedCount === 'number' && (
                  <div>
                    {t.game.debug.archiveScanned}: {debug.archiveScannedCount}
                  </div>
                )}
                {typeof debug.archiveMatchedCount === 'number' && (
                  <div>
                    {t.game.debug.archiveMatched}: {debug.archiveMatchedCount}
                  </div>
                )}
                {typeof debug.archiveAddedCount === 'number' && (
                  <div>
                    {t.game.debug.archiveAdded}: {debug.archiveAddedCount}
                  </div>
                )}
                {typeof debug.archivedUpsertedCount === 'number' && (
                  <div>
                    {t.game.debug.archivedUpserted}: {debug.archivedUpsertedCount}
                  </div>
                )}
                {debug.archiveLogs && debug.archiveLogs.length > 0 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <div>{t.game.debug.archiveLogs}:</div>
                    <pre className="mt-1 whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-2 text-[11px] leading-relaxed dark:border-slate-700 dark:bg-slate-800">
                      {debug.archiveLogs.join('\n')}
                    </pre>
                  </div>
                )}
                {debug.fallbackTerms && debug.fallbackTerms.length > 0 && (
                  <div>
                    {t.game.debug.fallbackTerms}: {debug.fallbackTerms.join(', ')}
                  </div>
                )}
                {debug.error && (
                  <div>
                    {t.game.debug.error}: {debug.error}
                  </div>
                )}
                {debug.archiveError && (
                  <div>
                    {t.game.debug.archiveError}: {debug.archiveError}
                  </div>
                )}
              </div>
            </div>
          )}

          {posts.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:bg-slate-900 dark:border-slate-700">
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 w-[40%]">{t.game.table.titlePreview}</th>
                      <th className="px-4 py-3">{t.game.table.score}</th>
                      <th className="px-4 py-3">{t.game.table.comments}</th>
                      <th className="px-4 py-3">{t.game.table.subreddit}</th>
                      <th className="px-4 py-3">{t.game.table.age}</th>
                      <th className="px-4 py-3 text-right">{t.game.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => {
                      const expanded = !!expandedIds[post.id];
                      return (
                        <tr
                          key={post.id}
                          className="border-t border-gray-100 align-top dark:border-slate-700"
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-gray-900 dark:text-slate-100">
                              {post.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 dark:text-slate-400">
                              u/{post.author} • r/{post.subreddit}
                            </div>
                            <div className="mt-3 text-gray-700 text-sm leading-relaxed whitespace-pre-line dark:text-slate-300">
                              {expanded
                                ? post.selftext || t.game.noSelftext
                                : previewText(post.selftext)}
                            </div>
                            {post.thumbnail && (
                              <div className="mt-3 w-full max-w-xs overflow-hidden rounded-lg border border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                                <img
                                  src={post.thumbnail}
                                  alt=""
                                  className="h-28 w-full object-cover"
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-800 dark:bg-slate-800 dark:text-slate-200">
                              ▲ {post.score}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-800 dark:text-slate-200">
                            {post.comments}
                          </td>
                          <td className="px-4 py-4 text-gray-700 dark:text-slate-300">
                            r/{post.subreddit}
                          </td>
                          <td className="px-4 py-4 text-gray-600 dark:text-slate-400">
                            {formatAge(post.createdAt, t.game.time)} {t.game.time.ago}
                          </td>
                          <td className="px-4 py-4 text-right space-y-2">
                            <button
                              className="text-sm font-semibold text-[#d93900] underline underline-offset-4"
                              onClick={() => toggleExpand(post.id)}
                            >
                              {expanded ? t.game.table.hide : t.game.table.viewMore}
                            </button>
                            <div>
                              <button
                                className="text-sm text-gray-700 font-semibold underline underline-offset-4 dark:text-slate-300"
                                onClick={() => navigateTo(post.permalink)}
                              >
                                {t.game.table.openOnReddit}
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
