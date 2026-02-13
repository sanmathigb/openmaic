/**
 * Deepgram TTS API wrapper for high-quality voice synthesis
 */

import { cleanTextForTTS } from './questionParser';

/**
 * Represents the response structure from Deepgram's TTS API
 */
export interface DeepgramTTSResponse {
  audio: ArrayBuffer;
  contentType: string;
}

/**
 * Error class for Deepgram TTS errors
 */
export class DeepgramTTSError extends Error {
  public statusCode?: number;
  public response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = 'DeepgramTTSError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Converts text to speech using Deepgram's Aura TTS model
 * Aura provides natural, conversational voices perfect for interviews
 *
 @param text - The text to convert to speech
 * @param voice - Voice model to use (default: 'aura-helios-en')
 * @returns Audio data as ArrayBuffer
 */
export async function synthesizeSpeech(
  text: string,
  voice: string = 'aura-helios-en'
): Promise<DeepgramTTSResponse> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    throw new DeepgramTTSError(
      'DEEPGRAM_API_KEY environment variable is not set'
    );
  }

  // Clean up text for TTS (remove emotion metadata, stage directions, markdown)
  const cleanText = cleanTextForTTS(text)
    .replace(/[\*\_\`]/g, '') // Remove markdown
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (!cleanText) {
    throw new DeepgramTTSError('Empty text provided for TTS');
  }

  const url = new URL('https://api.deepgram.com/v1/speak');
  url.searchParams.set('model', voice);
  url.searchParams.set('encoding', 'linear16');
  url.searchParams.set('sample_rate', '24000');

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: cleanText }),
    });
  } catch (error) {
    throw new DeepgramTTSError(
      `Failed to connect to Deepgram TTS API: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }

    throw new DeepgramTTSError(
      `Deepgram TTS API request failed with status ${response.status}: ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  const audio = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'audio/wav';

  return { audio, contentType };
}

/**
 * Available Deepgram Aura voices
 */
export const DEEPGRAM_VOICES = {
  'helios': 'aura-helios-en', // Male, warm, professional
  'orpheus': 'aura-orpheus-en', // Male, energetic
  'asteria': 'aura-asteria-en', // Female, professional
  'luna': 'aura-luna-en', // Female, warm
} as const;

export type DeepgramVoice = keyof typeof DEEPGRAM_VOICES;

/**
 * Gets the full voice identifier from a shorthand
 */
export function getVoiceId(voice: DeepgramVoice): string {
  return DEEPGRAM_VOICES[voice] || DEEPGRAM_VOICES.helios;
}
