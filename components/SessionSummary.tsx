'use client';

import { useState } from 'react';
import { Session } from '@/types';
import JSZip from 'jszip';
import {
  downloadBlob,
  exportUserRecordings,
  exportMixedPodcast,
  formatDuration,
  generateExportFilename,
  openBlob,
  saveBlob,
} from '@/lib/audioExport';
import { buildSegmentsFromSnippets, buildTitleAndDescription, buildTranscriptMarkdown } from '@/lib/mediaPack';
import { toSrt, toVtt } from '@/lib/captions';
import type { MediaPackManifest, TranslationPack, TranscriptSegment } from '@/types';

interface SessionSummaryProps {
  session: Session;
  onClose: () => void;
  onDownload?: () => void;
}

export default function SessionSummary({ session, onClose, onDownload }: SessionSummaryProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportType, setExportType] = useState<'user' | 'podcast' | 'raw' | null>(null);
  const [isExportingPack, setIsExportingPack] = useState(false);
  const [packStatus, setPackStatus] = useState<string | null>(null);
  const [lastExportBlob, setLastExportBlob] = useState<Blob | null>(null);
  const [lastExportFilename, setLastExportFilename] = useState<string | null>(null);

  const hasUserAudio = session.snippets.some(s => s.audioBlob && s.audioBlob.size > 0);
  const hasQuestionAudio = session.snippets.some(s => s.questionAudioBlob && s.questionAudioBlob.size > 0);

  const handleDownloadUserRecordings = async () => {
    setIsExporting(true);
    setExportType('user');
    setExportStatus('Processing your recordings...');

    try {
      const result = await exportUserRecordings(session.snippets);

      if (result) {
        const filename = generateExportFilename(session.id, 'mp3');
        setLastExportBlob(result.blob);
        setLastExportFilename(filename);
        const saved = await saveBlob(result.blob, filename);
        setExportStatus(saved ? `Saved ${filename} (${formatDuration(result.duration)})` : 'Save cancelled');
        if (saved && onDownload) {
          setTimeout(() => onDownload(), 1500);
        }
      } else {
        setExportStatus('No audio to export');
      }
    } catch (error) {
      console.error('Audio export error:', error);
      setExportStatus(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleDownloadMixedPodcast = async () => {
    setIsExporting(true);
    setExportType('podcast');
    setExportStatus('Creating mixed podcast...');

    try {
      const result = await exportMixedPodcast(session.snippets);

      if (result) {
        const filename = generateExportFilename(session.id, 'mp3');
        setLastExportBlob(result.blob);
        setLastExportFilename(filename);
        const saved = await saveBlob(result.blob, filename);
        setExportStatus(saved ? `Saved ${filename} (${formatDuration(result.duration)})` : 'Save cancelled');
        if (saved && onDownload) {
          setTimeout(() => onDownload(), 1500);
        }
      } else {
        setExportStatus('Could not mix podcast audio. Use Raw Session ZIP for Descript.');
      }
    } catch (error) {
      console.error('Podcast export error:', error);
      setExportStatus('Could not mix podcast audio. Use Raw Session ZIP for Descript.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleDownloadTranscript = async () => {
    try {
      const transcript = buildTranscriptMarkdown(session.snippets, session.projectDescription);
      const blob = new Blob([transcript], { type: 'text/markdown' });
      const date = new Date().toISOString().split('T')[0];
      const filename = `openmaic-${date}-${session.id.slice(0, 8)}.md`;
      setLastExportBlob(blob);
      setLastExportFilename(filename);
      const saved = await saveBlob(blob, filename);
      if (saved && onDownload) onDownload();
    } catch (error) {
      console.error('Transcript export error:', error);
    }
  };

  const handleDownloadRawSession = async () => {
    setIsExporting(true);
    setExportType('raw');
    setExportStatus('Packaging raw session...');

    try {
      const zip = new JSZip();
      const date = new Date().toISOString().split('T')[0];
      const transcript = buildTranscriptMarkdown(session.snippets, session.projectDescription);

      zip.file('transcript.md', transcript);
      zip.file('session.json', JSON.stringify({
        id: session.id,
        projectDescription: session.projectDescription,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        snippets: session.snippets.map((snippet, index) => ({
          index: index + 1,
          id: snippet.id,
          question: snippet.question,
          answer: snippet.answer,
          timestamp: snippet.timestamp,
          answerAudioFile: snippet.audioBlob ? `recordings/answer-${index + 1}.webm` : null,
          questionAudioFile: snippet.questionAudioBlob ? `questions/question-${index + 1}.mp3` : null,
        })),
      }, null, 2));

      for (let index = 0; index < session.snippets.length; index++) {
        const snippet = session.snippets[index];
        if (snippet.audioBlob) {
          zip.file(`recordings/answer-${index + 1}.webm`, await snippet.audioBlob.arrayBuffer());
        }
        if (snippet.questionAudioBlob) {
          zip.file(`questions/question-${index + 1}.mp3`, await snippet.questionAudioBlob.arrayBuffer());
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const filename = `openmaic-raw-session-${date}-${session.id.slice(0, 8)}.zip`;
      setLastExportBlob(blob);
      setLastExportFilename(filename);
      const saved = await saveBlob(blob, filename);
      setExportStatus(saved ? `Saved ${filename}` : 'Save cancelled');
    } catch (error) {
      console.error('Raw export error:', error);
      setExportStatus(error instanceof Error ? error.message : 'Raw export failed');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleOpenLastExport = () => {
    if (!lastExportBlob || !lastExportFilename) return;
    try {
      openBlob(lastExportBlob);
    } catch {
      // Popup blocked — fall back to re-downloading the file.
      downloadBlob(lastExportBlob, lastExportFilename);
    }
  };

  const handleExportLinkedInPack = async () => {
    if (isExportingPack) return;
    setIsExportingPack(true);
    setPackStatus('Preparing files...');

    try {
      const useMixed = hasUserAudio && hasQuestionAudio;
      const exportResult = useMixed
        ? await exportMixedPodcast(session.snippets)
        : await exportUserRecordings(session.snippets);

      if (!exportResult) {
        setPackStatus('No audio to export');
        return;
      }

      const includeQuestions = useMixed;
      const segments = await buildSegmentsFromSnippets(session.snippets, includeQuestions);
      const srt = toSrt(segments);
      const vtt = toVtt(segments);
      const transcriptMd = buildTranscriptMarkdown(session.snippets, session.projectDescription);
      const { title, description } = buildTitleAndDescription(session.snippets);

      setPackStatus('Translating...');
      const translationPack: TranslationPack = {};
      const targetLangs = ['es', 'fr'];

      if (segments.length > 0) {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segments: segments.map((s) => s.text),
            targetLangs,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          for (const lang of targetLangs) {
            const translatedSegments: TranscriptSegment[] = (data.translations?.[lang] || []).map((text: string, i: number) => ({
              ...segments[i],
              text,
            }));
            translationPack[lang] = {
              transcriptMd: `# ${lang.toUpperCase()} Translation\n\n` + translatedSegments.map((s: TranscriptSegment) => s.text).join('\n\n'),
              srt: toSrt(translatedSegments),
              vtt: toVtt(translatedSegments),
            };
          }
        }
      }

      setPackStatus('Packaging...');
      const zip = new JSZip();
      const date = new Date().toISOString().split('T')[0];
      const audioFilename = `audio-${date}-${session.id.slice(0, 8)}.mp3`;
      zip.file(audioFilename, await exportResult.blob.arrayBuffer());
      zip.file('captions.en.srt', srt);
      zip.file('captions.en.vtt', vtt);
      zip.file('transcript.en.md', transcriptMd);

      for (const [lang, pack] of Object.entries(translationPack)) {
        zip.file(`translations/${lang}/transcript.md`, pack.transcriptMd);
        zip.file(`translations/${lang}/captions.srt`, pack.srt);
        zip.file(`translations/${lang}/captions.vtt`, pack.vtt);
      }

      const manifest: MediaPackManifest = {
        title,
        description,
        durationSeconds: exportResult.duration,
        createdAt: new Date().toISOString(),
        platform: 'linkedin',
        languages: ['en', ...Object.keys(translationPack)],
      };
      zip.file('meta.json', JSON.stringify(manifest, null, 2));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = `openmaic-linkedin-pack-${date}-${session.id.slice(0, 8)}.zip`;
      setLastExportBlob(zipBlob);
      setLastExportFilename(zipName);
      const saved = await saveBlob(zipBlob, zipName);
      setPackStatus(saved ? `Saved ${zipName}` : 'Save cancelled');
    } catch (error) {
      console.error('Media pack export error:', error);
      setPackStatus('Export failed');
    } finally {
      setIsExportingPack(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-foreground/10 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-8 space-y-8 shadow-warm-xl">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Nice work!</h2>
          <p className="text-muted-foreground">
            {session.snippets.length} question{session.snippets.length !== 1 ? 's' : ''} answered
          </p>
        </div>

        {/* Download Options */}
        <div className="space-y-3">
          {/* Raw session export is the most reliable Descript handoff. */}
          {hasUserAudio && (
            <button
              onClick={handleDownloadRawSession}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-primary hover:bg-accent
                         text-primary-foreground font-medium rounded-xl transition-all duration-200
                         disabled:opacity-50 shadow-warm active:scale-[0.98]"
            >
              <span className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>
                  {isExporting && exportType === 'raw'
                    ? exportStatus
                    : 'Save Raw Session ZIP'}
                </span>
              </span>
              {!(isExporting && exportType === 'raw') && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>
          )}

          {hasUserAudio && (
            <button
              onClick={handleDownloadUserRecordings}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80
                         text-foreground font-medium rounded-xl transition-all duration-200
                         border border-border disabled:opacity-50 active:scale-[0.98]"
            >
              <span className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>
                  {isExporting && exportType === 'user'
                    ? exportStatus
                    : 'Download Your Recordings'}
                </span>
              </span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}

          {/* Mixed Podcast (Questions + Answers) */}
          {hasUserAudio && hasQuestionAudio && (
            <button
              onClick={handleDownloadMixedPodcast}
              disabled={isExporting}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80
                         text-foreground font-medium rounded-xl transition-all duration-200 
                         border border-border disabled:opacity-50 active:scale-[0.98]"
            >
              <span className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span>
                  {isExporting && exportType === 'podcast' 
                    ? exportStatus 
                    : 'Download Full Podcast (experimental)'}
                </span>
              </span>
              {!(isExporting && exportType === 'podcast') && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={handleExportLinkedInPack}
            disabled={isExportingPack}
            className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80
                       text-foreground font-medium rounded-xl transition-all duration-200 
                       border border-border disabled:opacity-50 active:scale-[0.98]"
          >
            <span className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8m5 4a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h6l2 2h6a2 2 0 012 2z" />
              </svg>
              <span>
                {isExportingPack ? (packStatus || 'Exporting...') : 'Export LinkedIn Pack'}
              </span>
            </span>
            {!isExportingPack && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>

          <button
            onClick={handleDownloadTranscript}
            className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80
                       text-foreground font-medium rounded-xl transition-all duration-200 
                       border border-border active:scale-[0.98]"
          >
            <span className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download Transcript</span>
            </span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {lastExportBlob && lastExportFilename && (
            <button
              onClick={handleOpenLastExport}
              className="w-full flex items-center justify-between p-4 bg-muted hover:bg-muted/80
                         text-foreground font-medium rounded-xl transition-all duration-200
                         border border-border active:scale-[0.98]"
            >
              <span className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-4.553M19.553 5.447V10m0-4.553H15M9 14l-4.553 4.553M4.447 18.553V14m0 4.553H9" />
                </svg>
                <span>Open last export</span>
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[12rem]">{lastExportFilename}</span>
            </button>
          )}
        </div>

        {exportStatus && <p role="status" className="text-sm text-center break-words">{exportStatus}</p>}
        {packStatus && <p role="status" className="text-sm text-center break-words">{packStatus}</p>}
        {!hasUserAudio && (
          <p role="status" className="text-sm text-center text-muted-foreground">
            Recordings are unavailable. They are kept only while this page stays open; your transcript can still be downloaded.
          </p>
        )}

        {/* Closing note */}
        <div className="text-center space-y-4 pt-2">
          <p className="text-muted-foreground text-sm">
            Keep us in the loop. Excited to see where this goes.
          </p>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm font-medium 
                       transition-colors px-4 py-2 hover:bg-muted rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
