import express from 'express';
import {
  InitResponse,
  IncrementResponse,
  DecrementResponse,
  SearchPost,
  SearchPostsResponse,
} from '../shared/types/api';
import {
  redis,
  reddit,
  settings as devvitSettings,
  createServer,
  context,
  getServerPort,
} from '@devvit/web/server';
import { createPost } from './core/post';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

type ArchiveRow = {
  id: string;
  title: string;
  author: string;
  score: number;
  comments: number;
  permalink: string;
  subreddit: string;
  created_at: string;
  thumbnail: string | null;
  selftext: string;
};

type ArchiveConfigSource = 'settings' | 'env' | 'mixed' | 'none';

type ArchiveConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseTable: string;
  archiveFetchLimit: number;
  source: ArchiveConfigSource;
};

const sanitizeString = (value: string | undefined | null) => (value ?? '').trim();

const parseFetchLimit = (value: string | undefined, fallback = 5000) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 100), 10000);
};

const getSettingSafely = async (key: string) => {
  try {
    return await devvitSettings.get<string>(key);
  } catch (error) {
    console.warn('[settings] failed to read app setting', { key, error });
    return undefined;
  }
};

const resolveArchiveConfig = async (): Promise<ArchiveConfig> => {
  const [settingSupabaseUrl, settingServiceRoleKey, settingTable, settingFetchLimit] =
    await Promise.all([
      getSettingSafely('supabase_url'),
      getSettingSafely('supabase_service_role_key'),
      getSettingSafely('supabase_table'),
      getSettingSafely('archive_fetch_limit'),
    ]);

  const envSupabaseUrl = process.env.SUPABASE_URL;
  const envServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const envTable = process.env.SUPABASE_TABLE;
  const envFetchLimit = process.env.ARCHIVE_FETCH_LIMIT;

  const hasSettingsValues = Boolean(
    sanitizeString(settingSupabaseUrl) ||
      sanitizeString(settingServiceRoleKey) ||
      sanitizeString(settingTable) ||
      sanitizeString(settingFetchLimit)
  );
  const hasEnvValues = Boolean(
    sanitizeString(envSupabaseUrl) ||
      sanitizeString(envServiceRoleKey) ||
      sanitizeString(envTable) ||
      sanitizeString(envFetchLimit)
  );

  const source: ArchiveConfigSource = hasSettingsValues
    ? hasEnvValues
      ? 'mixed'
      : 'settings'
    : hasEnvValues
      ? 'env'
      : 'none';

  const supabaseUrl = sanitizeString(settingSupabaseUrl || envSupabaseUrl).replace(/\/$/, '');
  const supabaseServiceRoleKey = sanitizeString(settingServiceRoleKey || envServiceRoleKey);
  const supabaseTable = sanitizeString(settingTable || envTable) || 'reddit_posts';
  const archiveFetchLimit = parseFetchLimit(settingFetchLimit || envFetchLimit);

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    supabaseTable,
    archiveFetchLimit,
    source,
  };
};

const isArchiveEnabled = (config: ArchiveConfig) =>
  Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);

const toArchiveRow = (post: SearchPost): ArchiveRow => ({
  id: post.id,
  title: post.title,
  author: post.author,
  score: post.score,
  comments: post.comments,
  permalink: post.permalink,
  subreddit: post.subreddit,
  created_at: post.createdAt,
  thumbnail: post.thumbnail ?? null,
  selftext: post.selftext ?? '',
});

const fromArchiveRow = (row: ArchiveRow): SearchPost => ({
  id: row.id,
  title: row.title,
  author: row.author,
  score: Number(row.score) || 0,
  comments: Number(row.comments) || 0,
  permalink: row.permalink,
  subreddit: row.subreddit,
  createdAt: row.created_at,
  thumbnail: row.thumbnail,
  selftext: row.selftext ?? '',
});

const supabaseHeaders = (config: ArchiveConfig) => ({
  apikey: config.supabaseServiceRoleKey,
  Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
  'Content-Type': 'application/json',
});

const archivePosts = async (config: ArchiveConfig, posts: SearchPost[]): Promise<number> => {
  if (!isArchiveEnabled(config) || posts.length === 0) return 0;

  const endpoint = `${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.supabaseTable)}?on_conflict=id`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(config),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(posts.map(toArchiveRow)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Archive upsert failed (${response.status}): ${text.slice(0, 250)}`);
  }

  return posts.length;
};

const loadArchivePosts = async (config: ArchiveConfig): Promise<SearchPost[]> => {
  if (!isArchiveEnabled(config)) return [];

  const params = new URLSearchParams({
    select: 'id,title,author,score,comments,permalink,subreddit,created_at,thumbnail,selftext',
    order: 'created_at.desc',
    limit: config.archiveFetchLimit.toString(),
  });
  const endpoint = `${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.supabaseTable)}?${params.toString()}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: supabaseHeaders(config),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Archive fetch failed (${response.status}): ${text.slice(0, 250)}`);
  }

  const rows = (await response.json()) as ArchiveRow[];
  return rows.map(fromArchiveRow);
};

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.get('/api/search-posts', async (req, res): Promise<void> => {
  const startTime = Date.now();
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const rawQuery = typeof req.query.query === 'string' ? req.query.query : 'ADHD';
  const query = rawQuery.trim() || 'ADHD';
  const appName = context.appName;
  const appVersion = context.appVersion;
  const archiveConfig = await resolveArchiveConfig();
  const archiveEnabled = isArchiveEnabled(archiveConfig);
  const archiveLogs: string[] = [];
  const pushArchiveLog = (message: string) => {
    if (archiveLogs.length < 40) archiveLogs.push(message);
  };
  pushArchiveLog(
    `config source=${archiveConfig.source} enabled=${archiveEnabled} table=${archiveConfig.supabaseTable} fetchLimit=${archiveConfig.archiveFetchLimit} url=${archiveConfig.supabaseUrl ? 'set' : 'missing'} key=${archiveConfig.supabaseServiceRoleKey ? 'set' : 'missing'}`
  );

  const parsedLimit = Number(req.query.limit);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 1;
  console.info('[search-posts] request', {
    requestId,
    appName,
    appVersion,
    archiveEnabled,
    archiveConfigSource: archiveConfig.source,
    rawQuery,
    query,
    limit,
  });

  const mapTerms = (text: string) =>
    text
      .toLowerCase()
      .replace(/[():|"']/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter((term) => !['and', 'or', 'not', 'title', 'selftext', 'body'].includes(term));

  const terms = mapTerms(query);
  const phrases = Array.from(query.matchAll(/"([^"]+)"/g))
    .map((match) => (match[1] ?? '').trim().toLowerCase())
    .filter(Boolean);
  const hasExplicitOr = /\bor\b/i.test(query);
  const debugTerms = [...terms, ...phrases.map((phrase) => `"${phrase}"`)];
  console.info('[search-posts] parsed terms', {
    requestId,
    terms,
    phrases,
    hasExplicitOr,
  });

  const mapPost = (post: {
    id: string;
    title: string;
    authorName: string;
    score: number;
    numberOfComments: number;
    permalink: string;
    subredditName: string;
    createdAt: Date;
    thumbnail: { url: string; height: number; width: number } | undefined;
    body: string | undefined;
  }): SearchPost => ({
    id: post.id,
    title: post.title,
    author: post.authorName,
    score: post.score,
    comments: post.numberOfComments,
    permalink: `https://reddit.com${post.permalink}`,
    subreddit: post.subredditName,
    createdAt: post.createdAt.toISOString(),
    thumbnail: post.thumbnail && post.thumbnail.url.startsWith('http') ? post.thumbnail.url : null,
    selftext: post.body ?? '',
  });

  const rankPosts = (candidatePosts: SearchPost[], excludedIds = new Set<string>()) =>
    candidatePosts
      .map((post) => {
        if (excludedIds.has(post.id)) return null;

        const haystack = `${post.title} ${post.selftext ?? ''}`.toLowerCase();
        const termMatches = terms.reduce((count, term) => count + Number(haystack.includes(term)), 0);
        const phraseMatches = phrases.reduce(
          (count, phrase) => count + Number(haystack.includes(phrase)),
          0
        );
        const termsSatisfied =
          terms.length === 0 ? true : hasExplicitOr ? termMatches > 0 : termMatches === terms.length;
        const phrasesSatisfied = phrases.length === 0 ? true : phraseMatches === phrases.length;
        if (!termsSatisfied || !phrasesSatisfied) return null;

        return {
          post,
          termMatches,
          phraseMatches,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => {
        if (b.phraseMatches !== a.phraseMatches) return b.phraseMatches - a.phraseMatches;
        if (b.termMatches !== a.termMatches) return b.termMatches - a.termMatches;
        if (b.post.score !== a.post.score) return b.post.score - a.post.score;
        return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
      });

  try {
    const scanLimit = Math.min(Math.max(limit * 25, 250), 800);
    pushArchiveLog(`live scan start scanLimit=${scanLimit}`);
    const [newPosts, hotPosts, risingPosts, topPosts] = await Promise.all([
      reddit.getNewPosts({ subredditName: 'all', limit: scanLimit }).all(),
      reddit.getHotPosts({ subredditName: 'all', limit: scanLimit }).all(),
      reddit.getRisingPosts({ subredditName: 'all', limit: scanLimit }).all(),
      reddit.getTopPosts({ subredditName: 'all', timeframe: 'day', limit: scanLimit }).all(),
    ]);

    const allCandidates = [...newPosts, ...hotPosts, ...risingPosts, ...topPosts];
    const deduped = Array.from(new Map(allCandidates.map((post) => [post.id, post])).values());
    const liveCandidates = deduped.map((post) => mapPost(post));
    const liveRanked = rankPosts(liveCandidates);
    let posts = liveRanked.slice(0, limit).map(({ post }) => post);
    pushArchiveLog(
      `live scan done candidates=${liveCandidates.length} matched=${liveRanked.length} returned=${posts.length}`
    );
    let archiveScannedCount = 0;
    let archiveMatchedCount = 0;
    let archiveAddedCount = 0;
    let archivedUpsertedCount = 0;
    let archiveError: string | undefined;

    const archiveUpsertPromise = archiveEnabled
      ? (async () => {
          pushArchiveLog(`archive upsert start rows=${liveCandidates.length}`);
          const upserted = await archivePosts(archiveConfig, liveCandidates);
          pushArchiveLog(`archive upsert done rows=${upserted}`);
          return upserted;
        })()
      : Promise.resolve(0);
    if (!archiveEnabled) {
      pushArchiveLog('archive disabled: missing supabase_url or supabase_service_role_key');
    }

    if (archiveEnabled && posts.length < limit) {
      try {
        pushArchiveLog('archive fetch start');
        const archiveCandidates = await loadArchivePosts(archiveConfig);
        archiveScannedCount = archiveCandidates.length;
        const archiveRanked = rankPosts(archiveCandidates, new Set(posts.map((post) => post.id)));
        archiveMatchedCount = archiveRanked.length;

        const archiveSupplement = archiveRanked
          .slice(0, limit - posts.length)
          .map(({ post }) => post);
        archiveAddedCount = archiveSupplement.length;
        posts = [...posts, ...archiveSupplement];
        pushArchiveLog(
          `archive fetch done scanned=${archiveScannedCount} matched=${archiveMatchedCount} added=${archiveAddedCount} total=${posts.length}`
        );
      } catch (error) {
        archiveError = error instanceof Error ? error.message : 'Unknown archive error';
        pushArchiveLog(`archive fetch error=${archiveError}`);
        console.error('[search-posts] archive fetch error', { requestId, archiveError });
      }
    } else if (archiveEnabled) {
      pushArchiveLog(`archive fetch skipped current=${posts.length} limit=${limit}`);
    }

    if (archiveEnabled) {
      try {
        archivedUpsertedCount = await archiveUpsertPromise;
      } catch (error) {
        const upsertError = error instanceof Error ? error.message : 'Unknown archive upsert error';
        archiveError = archiveError ?? upsertError;
        pushArchiveLog(`archive upsert error=${upsertError}`);
        console.error('[search-posts] archive upsert error', { requestId, error: upsertError });
      }
    }

    console.info('[search-posts] listing search results', {
      requestId,
      scanLimit,
      candidateCount: liveCandidates.length,
      matchedCount: liveRanked.length,
      returnedCount: posts.length,
      archiveScannedCount,
      archiveMatchedCount,
      archiveAddedCount,
      archivedUpsertedCount,
    });

    const result: SearchPostsResponse = {
      type: 'searchPosts',
      query,
      limit,
      posts,
      debug: {
        appName,
        appVersion,
        archiveEnabled,
        archiveConfigSource: archiveConfig.source,
        requestId,
        receivedQuery: rawQuery,
        normalizedQuery: query,
        limit,
        source: 'upstream',
        upstreamCount: liveCandidates.length,
        matchedCount: liveRanked.length,
        fallbackCount: posts.length,
        fallbackTerms: debugTerms,
        archiveScannedCount,
        archiveMatchedCount,
        archiveAddedCount,
        archivedUpsertedCount,
        archiveLogs,
        durationMs: Date.now() - startTime,
        ...(archiveError ? { archiveError } : {}),
      },
    };

    res.json(result);
  } catch (error) {
    console.error('API Search Error:', requestId, error);
    const result: SearchPostsResponse = {
      type: 'searchPosts',
      query,
      limit,
      posts: [],
      debug: {
        appName,
        appVersion,
        archiveEnabled,
        archiveConfigSource: archiveConfig.source,
        requestId,
        receivedQuery: rawQuery,
        normalizedQuery: query,
        limit,
        source: 'fallback-exception',
        fallbackCount: 0,
        fallbackTerms: debugTerms,
        archiveLogs,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    res.json(result);
  }
});

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
