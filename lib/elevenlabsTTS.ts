/**
 * ElevenLabs TTS API wrapper for prompt voice synthesis.
 */

import { cleanTextForTTS } from './questionParser';

export interface ElevenLabsTTSResponse {
  audio: ArrayBuffer;
  contentType: string;
}

export class ElevenLabsTTSError extends Error {
  public statusCode?: number;
  public response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = 'ElevenLabsTTSError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';

export async function synthesizeSpeech(text: string): Promise<ElevenLabsTTSResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new ElevenLabsTTSError('ELEVENLABS_API_KEY environment variable is not set');
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || DEFAULT_OUTPUT_FORMAT;

  const cleanText = cleanTextForTTS(text)
    .replace(/[\*\_\`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    throw new ElevenLabsTTSError('Empty text provided for TTS');
  }

  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set('output_format', outputFormat);

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: modelId,
      }),
    });
  } catch (error) {
    throw new ElevenLabsTTSError(
      `Failed to connect to ElevenLabs TTS API: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }

    throw new ElevenLabsTTSError(
      `ElevenLabs TTS API request failed with status ${response.status}: ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  const audio = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'audio/mpeg';

  return { audio, contentType };
}
