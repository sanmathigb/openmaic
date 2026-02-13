/**
 * Deepgram API wrapper for audio transcription
 */

/**
 * Represents a word in the transcript with timing information
 */
export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

/**
 * Represents an alternative transcription result
 */
export interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
}

/**
 * Represents a channel in the transcription response
 */
export interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

/**
 * Represents the results section of the Deepgram response
 */
export interface DeepgramResults {
  channels: DeepgramChannel[];
}

/**
 * Represents metadata about the transcription request
 */
export interface DeepgramMetadata {
  transaction_key: string;
  request_id: string;
  sha256: string;
  created: string;
  duration: number;
  channels: number;
  models: string[];
  model_info: Record<string, unknown>;
}

/**
 * The complete response structure from Deepgram's transcription API
 */
export interface DeepgramResponse {
  metadata: DeepgramMetadata;
  results: DeepgramResults;
}

/**
 * Error class for Deepgram API errors
 */
export class DeepgramError extends Error {
  public statusCode?: number;
  public response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = 'DeepgramError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Transcribes audio data using Deepgram's Nova-2 model
 *
 * @param audioData - The audio data as a Buffer or ArrayBuffer
 * @returns The transcribed text from the audio
 * @throws DeepgramError if the API request fails or returns an error
 *
 * @example
 * ```typescript
 * import { transcribeAudio } from '@/lib/deepgram';
 * import fs from 'fs';
 *
 * const audioBuffer = fs.readFileSync('audio.wav');
 * const transcript = await transcribeAudio(audioBuffer);
 * console.log(transcript);
 * ```
 */
export async function transcribeAudio(audioData: Buffer, contentType: string = 'audio/webm'): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    throw new DeepgramError(
      'DEEPGRAM_API_KEY environment variable is not set'
    );
  }

  const url = new URL('https://api.deepgram.com/v1/listen');
  url.searchParams.set('model', 'nova-2');
  url.searchParams.set('smart_format', 'true');
  url.searchParams.set('punctuate', 'true');

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': contentType,
      },
      body: new Uint8Array(audioData),
    });
  } catch (error) {
    throw new DeepgramError(
      `Failed to connect to Deepgram API: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }

    throw new DeepgramError(
      `Deepgram API request failed with status ${response.status}: ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  let data: DeepgramResponse;

  try {
    data = await response.json() as DeepgramResponse;
  } catch (error) {
    throw new DeepgramError(
      `Failed to parse Deepgram API response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Extract the transcript from the first channel's first alternative
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript;

  if (transcript === undefined || transcript === null) {
    throw new DeepgramError(
      'No transcript found in Deepgram response',
      undefined,
      data
    );
  }

  return transcript;
}
