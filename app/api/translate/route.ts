import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

interface TranslateRequestBody {
  segments: string[];
  targetLangs: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting (same as question route — both hit Claude)
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.question.maxRequests, RATE_LIMITS.question.windowMs);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          }
        }
      );
    }

    const body = (await request.json()) as TranslateRequestBody;

    if (!body || !Array.isArray(body.segments) || !Array.isArray(body.targetLangs)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Translation service not configured' }, { status: 503 });
    }

    const segments = body.segments.map((s) => String(s));
    const targetLangs = body.targetLangs.map((l) => String(l));

    // Basic abuse caps: this endpoint proxies to Claude on our key.
    if (segments.length > 200 || targetLangs.length > 5) {
      return NextResponse.json({ error: 'Too many segments or languages' }, { status: 400 });
    }
    const totalChars = segments.reduce((sum, s) => sum + s.length, 0);
    if (totalChars > 20000) {
      return NextResponse.json({ error: 'Segments too long (max 20,000 characters total)' }, { status: 400 });
    }

    const translations: Record<string, string[]> = {};

    for (const lang of targetLangs) {
      const system = `You are a translation engine. Translate each item to ${lang}. Return ONLY a JSON array of strings in the exact same order as input.`;
      const user = `Items:\n${segments.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nReturn JSON array only.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
          max_tokens: 2048,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `Translation failed: ${errorText}` }, { status: 502 });
      }

      const data = await response.json();
      const textContent = data?.content?.find((c: { type: string }) => c.type === 'text')?.text || '';

      const start = textContent.indexOf('[');
      const end = textContent.lastIndexOf(']');
      if (start === -1 || end === -1) {
        return NextResponse.json({ error: 'Translation output parse error' }, { status: 502 });
      }

      const jsonSlice = textContent.slice(start, end + 1);
      const parsed = JSON.parse(jsonSlice);
      if (!Array.isArray(parsed)) {
        return NextResponse.json({ error: 'Translation output not an array' }, { status: 502 });
      }

      translations[lang] = parsed.map((v) => String(v));
    }

    return NextResponse.json({ translations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}
