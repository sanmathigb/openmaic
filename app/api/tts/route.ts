import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/elevenlabsTTS';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.tts.maxRequests, RATE_LIMITS.tts.windowMs);
    
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

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    // Validate text length (prevent abuse)
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long (max 5,000 characters)' },
        { status: 400 }
      );
    }

    const { audio, contentType } = await synthesizeSpeech(text);

    return new NextResponse(audio, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audio.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS failed' },
      { status: 500 }
    );
  }
}
