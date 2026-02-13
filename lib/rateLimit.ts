/**
 * Simple in-memory rate limiting for API routes
 * Production-grade: Use Redis for distributed rate limiting
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitRecord>();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Checks if request is within rate limit
 * @param identifier - IP address or user ID
 * @param maxRequests - Max requests per window (default: 10)
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up old entries periodically (simple cleanup)
  if (rateLimitStore.size > 1000) {
    const cutoff = now - windowMs;
    rateLimitStore.forEach((value, key) => {
      if (value.resetTime < cutoff) {
        rateLimitStore.delete(key);
      }
    });
  }

  if (!record || now > record.resetTime) {
    // New window
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, newRecord);
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: newRecord.resetTime,
    };
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    reset: record.resetTime,
  };
}

/**
 * Gets client IP from request headers
 * Works with Vercel's x-forwarded-for header
 */
export function getClientIP(request: Request): string {
  // Vercel provides the real IP in x-forwarded-for
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Fallback to x-real-ip or remote-address
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  // Last resort (won't work well with proxies)
  return 'unknown';
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
  // Question generation: expensive, limit strictly
  question: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  
  // Transcription: more generous
  transcribe: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
  
  // TTS: moderate
  tts: { maxRequests: 15, windowMs: 60000 }, // 15 per minute
} as const;
