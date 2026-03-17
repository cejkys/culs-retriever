export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type SearchPost = {
  id: string;
  title: string;
  author: string;
  score: number;
  comments: number;
  permalink: string;
  subreddit: string;
  createdAt: string;
  thumbnail?: string | null;
  selftext?: string;
};

export type SearchPostsResponse = {
  type: 'searchPosts';
  query: string;
  limit: number;
  posts: SearchPost[];
  debug?: SearchPostsDebug;
};

export type SearchPostsDebug = {
  appName?: string;
  appVersion?: string;
  archiveEnabled?: boolean;
  archiveConfigSource?: 'settings' | 'env' | 'mixed' | 'none';
  requestId: string;
  receivedQuery: string;
  normalizedQuery: string;
  limit: number;
  source: 'upstream' | 'fallback-empty' | 'fallback-upstream-error' | 'fallback-exception';
  upstreamStatus?: number;
  upstreamCount?: number;
  matchedCount?: number;
  fallbackCount?: number;
  fallbackTerms?: string[];
  archiveScannedCount?: number;
  archiveMatchedCount?: number;
  archiveAddedCount?: number;
  archivedUpsertedCount?: number;
  archiveLogs?: string[];
  durationMs: number;
  error?: string;
  archiveError?: string;
};
