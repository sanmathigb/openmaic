import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio, DeepgramError } from '@/lib/deepgram';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

/**
 * POST /api/transcribe
 *
 * Accepts audio data via FormData and returns the transcribed text.
 *
 * Request: FormData with 'audio' file field
 * Response: { transcript: string } on success
 *           { error: string } on failure
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.transcribe.maxRequests, RATE_LIMITS.transcribe.windowMs);
    
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

    // Parse the FormData from the request
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('Failed to parse FormData:', error);
      return NextResponse.json(
        { error: 'Invalid request: expected FormData with audio file' },
        { status: 400 }
      );
    }

    // Get the audio file from FormData
    const audioFile = formData.get('audio');

    if (!audioFile) {
      console.error('No audio file provided in FormData');
      return NextResponse.json(
        { error: 'No audio file provided. Please include an "audio" field in the FormData.' },
        { status: 400 }
      );
    }

    // Validate that it's a File/Blob
    if (!(audioFile instanceof Blob)) {
      console.error('Audio field is not a file:', typeof audioFile);
      return NextResponse.json(
        { error: 'Invalid audio data: expected a file' },
        { status: 400 }
      );
    }

    // Check if the file has content
    if (audioFile.size === 0) {
      console.error('Audio file is empty');
      return NextResponse.json(
        { error: 'Audio file is empty' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB to prevent abuse)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Audio file too large (max 10MB)' },
        { status: 413 }
      );
    }

    // Convert the file to a Buffer for the Deepgram API
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Determine content type from the file
    const contentType = audioFile.type || 'audio/webm';
    console.log(`Transcribing audio: ${audioFile.size} bytes, type: ${contentType}`);

    // Call Deepgram to transcribe the audio
    const transcript = await transcribeAudio(audioBuffer, contentType);

    // Handle edge case: empty or no speech detected
    if (!transcript || transcript.trim() === '') {
      console.log('Transcription returned empty - no speech detected');
      return NextResponse.json(
        { error: 'No speech detected in the audio. Please try recording again.' },
        { status: 422 }
      );
    }

    console.log(`Transcription successful: "${transcript.substring(0, 50)}..."`);

    return NextResponse.json({ transcript });
  } catch (error) {
    // Handle Deepgram-specific errors
    if (error instanceof DeepgramError) {
      console.error('Deepgram API error:', {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response,
      });

      // Map Deepgram status codes to appropriate HTTP responses
      const statusCode = error.statusCode || 500;

      if (statusCode === 401 || statusCode === 403) {
        return NextResponse.json(
          { error: 'Transcription service authentication failed. Please check API configuration.' },
          { status: 503 }
        );
      }

      if (statusCode === 429) {
        return NextResponse.json(
          { error: 'Transcription service rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `Transcription failed: ${error.message}` },
        { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
      );
    }

    // Handle unexpected errors
    console.error('Unexpected error in transcribe route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during transcription. Please try again.' },
      { status: 500 }
    );
  }
}
