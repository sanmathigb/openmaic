import type { Snippet, TranscriptSegment } from '@/types';

const WORDS_PER_SECOND = 2.6;

async function decodeDuration(blob: Blob): Promise<number | null> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    await audioContext.close();
    return audioBuffer.duration;
  } catch {
    return null;
  }
}

function estimateDurationFromText(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, wordCount / WORDS_PER_SECOND);
}

export async function buildSegmentsFromSnippets(
  snippets: Snippet[],
  includeQuestions: boolean
): Promise<TranscriptSegment[]> {
  const parts: Array<{ text: string; durationSec: number }> = [];

  for (const snippet of snippets) {
    if (includeQuestions) {
      const qText = snippet.question?.trim();
      if (qText) {
        let duration = qText ? estimateDurationFromText(qText) : 1;
        if (snippet.questionAudioBlob) {
          const decoded = await decodeDuration(snippet.questionAudioBlob);
          if (decoded) duration = decoded;
        }
        parts.push({ text: qText, durationSec: duration });
      }
    }

    const aText = snippet.answer?.trim();
    if (aText) {
      let duration = estimateDurationFromText(aText);
      if (snippet.audioBlob) {
        const decoded = await decodeDuration(snippet.audioBlob);
        if (decoded) duration = decoded;
      }
      parts.push({ text: aText, durationSec: duration });
    }
  }

  let cursorMs = 0;
  const segments: TranscriptSegment[] = parts.map((part) => {
    const startMs = cursorMs;
    const endMs = startMs + Math.max(500, Math.floor(part.durationSec * 1000));
    cursorMs = endMs;
    return {
      startMs,
      endMs,
      text: part.text,
    };
  });

  return segments;
}

export function buildTranscriptMarkdown(snippets: Snippet[], projectDescription?: string): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# ${date}\n\n`;
  if (projectDescription) {
    md += `${projectDescription}\n\n---\n\n`;
  }
  for (let i = 0; i < snippets.length; i++) {
    const snippet = snippets[i];
    md += `**Q:** ${snippet.question}\n\n`;
    md += `**A:** ${snippet.answer}\n\n`;
    if (i < snippets.length - 1) md += `---\n\n`;
  }

  return md;
}

export function buildTitleAndDescription(snippets: Snippet[]): { title: string; description: string } {
  const firstQ = snippets[0]?.question?.trim() || 'Session';
  const title = firstQ.length > 80 ? `${firstQ.slice(0, 77)}...` : firstQ;
  const description = `A builder thinking out loud in an OpenMaic session.`;
  return { title, description };
}
