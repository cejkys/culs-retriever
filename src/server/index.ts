import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, SearchPostsResponse } from '../shared/types/api';
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
  const rawQuery = typeof req.query.query === 'string' ? req.query.query : 'ADHD';
  const query = rawQuery.trim() || 'ADHD';

  const parsedLimit = Number(req.query.limit);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 12;
  console.info('[search-posts] request', { query, limit });

  const mapTerms = (text: string) =>
    text
      .toLowerCase()
      .replace(/[():|"']/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter((term) => !['and', 'or', 'not', 'title', 'selftext', 'body'].includes(term));

  const fallbackSearch = async () => {
    const listing = reddit.getNewPosts({
      subredditName: 'all',
      limit: Math.min(limit * 3, 100),
    });
    const freshPosts = await listing.all();
    const terms = mapTerms(query);

    const fallbackPosts = freshPosts
      .filter((post) => {
        if (terms.length === 0) return true;
        const haystack = `${post.title} ${post.body ?? ''}`.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, limit)
      .map((post) => ({
        id: post.id,
        title: post.title,
        author: post.authorName,
        score: post.score,
        comments: post.numberOfComments,
        permalink: `https://reddit.com${post.permalink}`,
        subreddit: post.subredditName,
        createdAt: post.createdAt.toISOString(),
        thumbnail:
          post.thumbnail && post.thumbnail.url.startsWith('http') ? post.thumbnail.url : null,
        selftext: post.body ?? '',
      }));

    console.info('[search-posts] fallback results', { count: fallbackPosts.length });
    return fallbackPosts;
  };

  try {
    const url = new URL('https://api.reddit.com/search');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('sort', 'relevance');
    url.searchParams.set('t', 'all');
    url.searchParams.set('raw_json', '1');
    console.info('[search-posts] upstream request', { url: url.toString() });

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'devvit-web-starter/0.0.0 (+https://developers.reddit.com/)' },
    });
    console.info('[search-posts] upstream status', { status: response.status });

    if (!response.ok) {
      const body = await response.text();
      console.error('Reddit search upstream error', response.status, body.slice(0, 300));
      try {
        const posts = await fallbackSearch();
        res.json({ type: 'searchPosts', query, limit, posts });
        return;
      } catch (fallbackError) {
        console.error('Fallback after upstream failure errored:', fallbackError);
      }
      res.status(response.status).json({
        status: 'error',
        message: `Reddit search failed (HTTP ${response.status})`,
        upstream: body.slice(0, 300),
      });
      return;
    }

    const payload = (await response.json()) as {
      data?: { children?: Array<{ data: Record<string, unknown> }> };
    };

    const children = payload.data?.children ?? [];
    console.info('[search-posts] upstream children', { count: children.length });

    const posts = children
      .map((child) => child.data)
      .filter((data) => typeof data === 'object' && data !== null)
      .map((data) => {
        const id = (data['id'] as string | undefined) ?? '';
        const title = (data['title'] as string | undefined) ?? '';
        const author = (data['author'] as string | undefined) ?? 'unknown';
        const subreddit = (data['subreddit'] as string | undefined) ?? '';
        const permalink = (data['permalink'] as string | undefined) ?? '';
        const thumbnail = (data['thumbnail'] as string | undefined) ?? '';
        const createdUtc = Number(data['created_utc'] ?? 0) * 1000;

        return {
          id,
          title,
          author,
          score: Number(data['score'] ?? 0),
          comments: Number(data['num_comments'] ?? 0),
          permalink: permalink ? `https://reddit.com${permalink}` : '',
          subreddit,
          createdAt: Number.isFinite(createdUtc) ? new Date(createdUtc).toISOString() : '',
          thumbnail: thumbnail && thumbnail.startsWith('http') ? thumbnail : null,
          selftext: (data['selftext'] as string | undefined) ?? '',
        };
      })
      .filter((post) => post.id && post.title);

    // If upstream search gave nothing, fall back to local filtered posts.
    if (posts.length === 0) {
      console.info('[search-posts] upstream empty, running fallback');
      const fallbackPosts = await fallbackSearch();
      res.json({ type: 'searchPosts', query, limit, posts: fallbackPosts });
      return;
    }

    const result: SearchPostsResponse = {
      type: 'searchPosts',
      query,
      limit,
      posts,
    };

    res.json(result);
  } catch (error) {
    console.error('API Search Error:', error);
    try {
      const posts = await fallbackSearch();
      res.json({ type: 'searchPosts', query, limit, posts });
      return;
    } catch (fallbackError) {
      console.error('Fallback search error:', fallbackError);
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to search posts',
    });
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
