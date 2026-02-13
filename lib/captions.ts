import type { TranscriptSegment } from '@/types';

function formatSrtTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const milliseconds = Math.max(0, ms % 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number, w: number) => n.toString().padStart(w, '0');
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
}

function formatVttTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const milliseconds = Math.max(0, ms % 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number, w: number) => n.toString().padStart(w, '0');
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(milliseconds, 3)}`;
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

export function toSrt(segments: TranscriptSegment[], maxCharsPerLine: number = 42): string {
  return segments
    .map((seg, idx) => {
      const lines = wrapLines(seg.text, maxCharsPerLine).join('\n');
      return `${idx + 1}\n${formatSrtTime(seg.startMs)} --> ${formatSrtTime(seg.endMs)}\n${lines}\n`;
    })
    .join('\n');
}

export function toVtt(segments: TranscriptSegment[], maxCharsPerLine: number = 42): string {
  const body = segments
    .map((seg) => {
      const lines = wrapLines(seg.text, maxCharsPerLine).join('\n');
      return `${formatVttTime(seg.startMs)} --> ${formatVttTime(seg.endMs)}\n${lines}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`.trim() + '\n';
}
