/**
 * Proper audio export using Web Audio API
 * Decodes all audio to PCM, mixes them, and exports as MP3
 */

import { Snippet } from '@/types';
import { audioBufferToMp3 } from '@/lib/mp3Encode';

export interface AudioExportResult {
  blob: Blob;
  duration: number;
  format: 'mp3';
}

/**
 * Decodes an audio blob to an AudioBuffer using Web Audio API
 */
async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer | null> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    await audioContext.close();
    return audioBuffer;
  } catch (error) {
    console.error('Failed to decode audio blob:', error);
    return null;
  }
}

/**
 * Exports an AudioBuffer to an MP3 file blob
 */
async function audioBufferToMp3Blob(audioBuffer: AudioBuffer): Promise<Blob> {
  return audioBufferToMp3(audioBuffer);
}

/**
 * Mixes multiple AudioBuffers sequentially into a single AudioBuffer
 */
async function mixAudioBuffersSequentially(
  buffers: AudioBuffer[],
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  if (buffers.length === 0) {
    throw new Error('No audio buffers to mix');
  }
  
  // Use the maximum number of channels from all buffers
  const maxChannels = Math.max(...buffers.map(b => b.numberOfChannels));
  
  // Calculate total duration
  const totalLength = Math.ceil(
    buffers.reduce((duration, buffer) => duration + buffer.duration, 0) * sampleRate
  );
  
  // Create offline context for mixing
  const offlineContext = new OfflineAudioContext(
    maxChannels,
    totalLength,
    sampleRate
  );
  
  // Create buffer sources and connect them sequentially
  let currentTime = 0;
  
  for (const buffer of buffers) {
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start(currentTime);
    currentTime += buffer.duration;
  }
  
  // Render the audio
  const renderedBuffer = await offlineContext.startRendering();
  return renderedBuffer;
}

/**
 * Exports only user recordings as a single audio file
 * This is the most reliable approach - no mixing with TTS needed
 */
export async function exportUserRecordings(snippets: Snippet[]): Promise<AudioExportResult | null> {
  const userAudioBlobs = snippets
    .filter(s => s.audioBlob && s.audioBlob.size > 0)
    .map(s => s.audioBlob!);

  if (userAudioBlobs.length === 0) {
    return null;
  }

  // Decode all audio blobs to AudioBuffers
  const decodedBuffers: AudioBuffer[] = [];
  for (const blob of userAudioBlobs) {
    const buffer = await decodeAudioBlob(blob);
    if (buffer) {
      decodedBuffers.push(buffer);
    }
  }

  if (decodedBuffers.length === 0) {
    return null;
  }

  // If only one recording, just convert it to MP3
  if (decodedBuffers.length === 1) {
    const mp3Blob = await audioBufferToMp3Blob(decodedBuffers[0]);
    return {
      blob: mp3Blob,
      duration: decodedBuffers[0].duration,
      format: 'mp3',
    };
  }

  // Mix multiple recordings sequentially
  const mixedBuffer = await mixAudioBuffersSequentially(decodedBuffers);
  const mp3Blob = await audioBufferToMp3Blob(mixedBuffer);

  return {
    blob: mp3Blob,
    duration: mixedBuffer.duration,
    format: 'mp3',
  };
}

/**
 * Exports a mixed podcast with AI questions and user answers interleaved
 * More complex but provides the full experience
 */
export async function exportMixedPodcast(snippets: Snippet[]): Promise<AudioExportResult | null> {
  const audioParts: { buffer: AudioBuffer; type: 'question' | 'answer' }[] = [];

  // Decode all audio parts
  for (const snippet of snippets) {
    // Add question audio (TTS)
    if (snippet.questionAudioBlob && snippet.questionAudioBlob.size > 0) {
      const buffer = await decodeAudioBlob(snippet.questionAudioBlob);
      if (buffer) {
        audioParts.push({ buffer, type: 'question' });
      }
    }

    // Add answer audio (user recording)
    if (snippet.audioBlob && snippet.audioBlob.size > 0) {
      const buffer = await decodeAudioBlob(snippet.audioBlob);
      if (buffer) {
        audioParts.push({ buffer, type: 'answer' });
      }
    }
  }

  if (audioParts.length === 0) {
    return null;
  }

  // Extract just the buffers for mixing
  const buffers = audioParts.map(p => p.buffer);
  const mixedBuffer = await mixAudioBuffersSequentially(buffers);
  const mp3Blob = await audioBufferToMp3Blob(mixedBuffer);

  return {
    blob: mp3Blob,
    duration: mixedBuffer.duration,
    format: 'mp3',
  };
}

/**
 * Downloads a blob as a file (generic utility for backwards compatibility)
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}

/**
 * Saves a blob using the File System Access API when available, falling back to
 * an anchor download for browsers that do not support it.
 *
 * Returns false only when the user cancelled the save dialog. The picker can
 * also throw when the transient user activation expired during a long encode —
 * that case (and any other picker failure) falls back to a plain download.
 */
export async function saveBlob(blob: Blob, filename: string): Promise<boolean> {
  const maybeWindow = window as typeof window & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  if (maybeWindow.showSaveFilePicker) {
    const extension = filename.split('.').pop() || '';
    try {
      const handle = await maybeWindow.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: `${extension.toUpperCase()} file`,
            accept: {
              [blob.type || 'application/octet-stream']: extension ? [`.${extension}`] : [],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false; // user cancelled — not an error
      }
      // Picker unavailable (e.g. expired user activation) — fall through.
    }
  }

  downloadBlob(blob, filename);
  return true;
}

/**
 * Opens a blob in a new tab as a fallback when a browser suppresses downloads.
 */
export function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');

  if (!opened) {
    URL.revokeObjectURL(url);
    throw new Error('Browser blocked download and preview popup');
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}

/**
 * Formats duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Generates a filename for the export
 */
export function generateExportFilename(sessionId: string, format: 'mp3' | 'webm' = 'mp3'): string {
  const date = new Date().toISOString().split('T')[0];
  return `openmaic-session-${date}-${sessionId.slice(0, 8)}.${format}`;
}
