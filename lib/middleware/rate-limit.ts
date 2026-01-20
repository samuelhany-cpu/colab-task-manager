/**
 * Rate Limiting Middleware
 *
 * Protects API routes from abuse using token bucket algorithm.
 * Tracks both IP-based and user-based rate limits.
 *
 * Usage in API routes:
 * ```typescript
 * import { rateLimit, rateLimitStrict } from "@/lib/middleware/rate-limit";
 *
 * export async function POST(req: Request) {
 *   const rateLimitResult = await rateLimit(req);
 *   if (!rateLimitResult.success) {
 *     return NextResponse.json(
 *       { error: "Too many requests" },
 *       { status: 429, headers: rateLimitResult.headers }
 *     );
 *   }
 *   // ... rest of handler
 * }
 * ```
 */

import { NextResponse } from "next/server";

// ============================================================================
// RATE LIMIT STORAGE
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limits
// In production, use Redis or Upstash for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

export const RATE_LIMITS = {
  // General API endpoints
  default: {
    requests: 100,
    window: 60 * 1000, // 1 minute
  },

  // Authentication endpoints (stricter)
  auth: {
    requests: 5,
    window: 60 * 1000, // 5 requests per minute
  },

  // Message/chat endpoints (spam prevention)
  chat: {
    requests: 30,
    window: 60 * 1000, // 30 messages per minute
  },

  // File uploads (prevent abuse)
  upload: {
    requests: 10,
    window: 60 * 1000, // 10 uploads per minute
  },

  // Search endpoints (prevent scraping)
  search: {
    requests: 20,
    window: 60 * 1000, // 20 searches per minute
  },

  // Comment/reaction endpoints
  interaction: {
    requests: 50,
    window: 60 * 1000, // 50 interactions per minute
  },

  // Very strict for sensitive operations
  strict: {
    requests: 3,
    window: 60 * 1000, // 3 requests per minute
  },
};

// ============================================================================
// RATE LIMITING FUNCTIONS
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
}

/**
 * Get client identifier (IP address)
 * Handles various proxy headers for Vercel/Cloudflare
 */
function getClientIdentifier(req: Request): string {
  const headers = req.headers;

  // Try various headers in order of preference
  const ip =
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("cf-connecting-ip") ||
    "unknown";

  return ip;
}

/**
 * Get user identifier from request
 * Returns userId if authenticated, otherwise falls back to IP
 */
async function getUserIdentifier(req: Request): Promise<string> {
  try {
    const { getCurrentUser } = await import("@/lib/supabase/server");
    const user = await getCurrentUser();
    if (user) {
      return `user:${user.id}`;
    }
  } catch {
    // Fall through to IP-based limiting
  }

  return `ip:${getClientIdentifier(req)}`;
}

/**
 * Core rate limiting logic using token bucket algorithm
 */
function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // No entry or expired - create new
    const resetAt = now + windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
    });

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetAt,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(limit - 1),
        "X-RateLimit-Reset": String(resetAt),
      },
    };
  }

  // Entry exists and is valid
  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      limit,
      remaining: 0,
      reset: entry.resetAt,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(entry.resetAt),
        "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
      },
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    reset: entry.resetAt,
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(limit - entry.count),
      "X-RateLimit-Reset": String(entry.resetAt),
    },
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Default rate limiter (100 req/min per user or IP)
 */
export async function rateLimit(req: Request): Promise<RateLimitResult> {
  const identifier = await getUserIdentifier(req);
  return checkRateLimit(
    identifier,
    RATE_LIMITS.default.requests,
    RATE_LIMITS.default.window,
  );
}

/**
 * Auth rate limiter (5 req/min per IP)
 * Used for login, registration, password reset
 */
export async function rateLimitAuth(req: Request): Promise<RateLimitResult> {
  const identifier = `ip:${getClientIdentifier(req)}`;
  return checkRateLimit(
    identifier,
    RATE_LIMITS.auth.requests,
    RATE_LIMITS.auth.window,
  );
}

/**
 * Chat rate limiter (30 messages/min per user)
 * Prevents spam in chat/messaging
 */
export async function rateLimitChat(req: Request): Promise<RateLimitResult> {
  const identifier = await getUserIdentifier(req);
  return checkRateLimit(
    identifier,
    RATE_LIMITS.chat.requests,
    RATE_LIMITS.chat.window,
  );
}

/**
 * Upload rate limiter (10 uploads/min per user)
 * Prevents abuse of file storage
 */
export async function rateLimitUpload(req: Request): Promise<RateLimitResult> {
  const identifier = await getUserIdentifier(req);
  return checkRateLimit(
    identifier,
    RATE_LIMITS.upload.requests,
    RATE_LIMITS.upload.window,
  );
}

/**
 * Search rate limiter (20 searches/min per user)
 * Prevents scraping and database load
 */
export async function rateLimitSearch(req: Request): Promise<RateLimitResult> {
  const identifier = await getUserIdentifier(req);
  return checkRateLimit(
    identifier,
    RATE_LIMITS.search.requests,
    RATE_LIMITS.search.window,
  );
}

/**
 * Interaction rate limiter (50 actions/min per user)
 * For comments, reactions, etc.
 */
export async function rateLimitInteraction(
  req: Request,
): Promise<RateLimitResult> {
  const identifier = await getUserIdentifier(req);
  return checkRateLimit(
    identifier,
    RATE_LIMITS.interaction.requests,
    RATE_LIMITS.interaction.window,
  );
}

/**
 * Strict rate limiter (3 req/min per user)
 * For very sensitive operations
 */
export async function rateLimitStrict(req: Request): Promise<RateLimitResult> {
  const identifier = await getUserIdentifier(req);
  return checkRateLimit(
    identifier,
    RATE_LIMITS.strict.requests,
    RATE_LIMITS.strict.window,
  );
}

/**
 * Create a 429 response with rate limit headers
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      retryAfter: result.headers["Retry-After"],
    },
    {
      status: 429,
      headers: result.headers,
    },
  );
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 *
 * Usage:
 * ```typescript
 * export const POST = withRateLimit(async (req: Request) => {
 *   // Your handler code
 * }, { type: 'chat' });
 * ```
 */
export function withRateLimit(
  handler: (req: Request) => Promise<NextResponse>,
  options: { type?: keyof typeof RATE_LIMITS } = {},
) {
  return async (req: Request): Promise<NextResponse> => {
    let result: RateLimitResult;

    switch (options.type) {
      case "auth":
        result = await rateLimitAuth(req);
        break;
      case "chat":
        result = await rateLimitChat(req);
        break;
      case "upload":
        result = await rateLimitUpload(req);
        break;
      case "search":
        result = await rateLimitSearch(req);
        break;
      case "interaction":
        result = await rateLimitInteraction(req);
        break;
      case "strict":
        result = await rateLimitStrict(req);
        break;
      default:
        result = await rateLimit(req);
    }

    if (!result.success) {
      return createRateLimitResponse(result);
    }

    const response = await handler(req);

    // Add rate limit headers to successful responses
    Object.entries(result.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

// ============================================================================
// ANTI-SPAM UTILITIES
// ============================================================================

/**
 * Detect spam messages using simple heuristics
 */
export function isSpamContent(content: string): boolean {
  // Check for excessive length
  if (content.length > 10000) {
    return true;
  }

  // Check for excessive repetition
  const words = content.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
    return true; // More than 70% repeated words
  }

  // Check for excessive caps
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (content.length > 20 && capsRatio > 0.7) {
    return true;
  }

  // Check for excessive URLs
  const urlCount = (content.match(/https?:\/\//g) || []).length;
  if (urlCount > 5) {
    return true;
  }

  return false;
}

/**
 * Check if a user is posting too frequently (burst detection)
 * Stricter than rate limiting - checks last few messages
 */
export async function checkBurstSpam(userId: string): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");

  // Check if user sent more than 5 messages in last 10 seconds
  const recentMessages = await prisma.message.count({
    where: {
      senderId: userId,
      createdAt: {
        gte: new Date(Date.now() - 10 * 1000),
      },
    },
  });

  return recentMessages > 5;
}
