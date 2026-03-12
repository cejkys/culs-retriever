import express from 'express';
import {
  InitResponse,
  IncrementResponse,
  DecrementResponse,
  SearchPostsResponse,
} from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

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

  const parsedLimit = Number(req.query.limit);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 12;
  console.info('[search-posts] request', { requestId, rawQuery, query, limit });

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
  }) => ({
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

  try {
    const scanLimit = Math.min(Math.max(limit * 25, 250), 800);
    const [newPosts, hotPosts, risingPosts, topPosts] = await Promise.all([
      reddit.getNewPosts({ subredditName: 'all', limit: scanLimit }).all(),
      reddit.getHotPosts({ subredditName: 'all', limit: scanLimit }).all(),
      reddit.getRisingPosts({ subredditName: 'all', limit: scanLimit }).all(),
      reddit.getTopPosts({ subredditName: 'all', timeframe: 'day', limit: scanLimit }).all(),
    ]);

    const allCandidates = [...newPosts, ...hotPosts, ...risingPosts, ...topPosts];
    const deduped = Array.from(new Map(allCandidates.map((post) => [post.id, post])).values());

    const ranked = deduped
      .map((post) => {
        const haystack = `${post.title} ${post.body ?? ''}`.toLowerCase();
        const termMatches = terms.reduce(
          (count, term) => count + Number(haystack.includes(term)),
          0
        );
        const phraseMatches = phrases.reduce(
          (count, phrase) => count + Number(haystack.includes(phrase)),
          0
        );
        const termsSatisfied =
          terms.length === 0
            ? true
            : hasExplicitOr
              ? termMatches > 0
              : termMatches === terms.length;
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
        return b.post.createdAt.getTime() - a.post.createdAt.getTime();
      });

    const posts = ranked.slice(0, limit).map(({ post }) => mapPost(post));
    console.info('[search-posts] listing search results', {
      requestId,
      scanLimit,
      candidateCount: deduped.length,
      matchedCount: ranked.length,
      returnedCount: posts.length,
    });

    const result: SearchPostsResponse = {
      type: 'searchPosts',
      query,
      limit,
      posts,
      debug: {
        requestId,
        receivedQuery: rawQuery,
        normalizedQuery: query,
        limit,
        source: 'upstream',
        upstreamCount: deduped.length,
        fallbackCount: posts.length,
        fallbackTerms: debugTerms,
        durationMs: Date.now() - startTime,
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
        requestId,
        receivedQuery: rawQuery,
        normalizedQuery: query,
        limit,
        source: 'fallback-exception',
        fallbackCount: 0,
        fallbackTerms: debugTerms,
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
