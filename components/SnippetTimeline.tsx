'use client';

import { useState, useRef, useEffect } from 'react';
import { Snippet } from '@/types';
import { downloadBlob } from '@/lib/audioExport';

interface SnippetTimelineProps {
  snippets: Snippet[];
}

export default function SnippetTimeline({ snippets }: SnippetTimelineProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onpause = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupAudio();
  }, []);

  const handlePlay = (snippet: Snippet) => {
    if (!snippet.audioBlob) return;

    // Stop current audio if playing
    cleanupAudio();

    if (playingId === snippet.id) {
      setPlayingId(null);
      return;
    }

    const url = URL.createObjectURL(snippet.audioBlob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audioUrlRef.current = url;

    audio.onended = () => {
      setPlayingId(null);
      cleanupAudio();
    };
    audio.onpause = () => {
      if (playingId === snippet.id) {
        setPlayingId(null);
      }
      cleanupAudio();
    };

    audio.play();
    setPlayingId(snippet.id);
  };

  const handleDownload = (snippet: Snippet, index: number) => {
    if (!snippet.audioBlob) return;

    const date = new Date().toISOString().split('T')[0];
    const filename = `openmaic-clip-${index + 1}-${date}.webm`;
    downloadBlob(snippet.audioBlob, filename);
  };

  if (snippets.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-card border border-border rounded-2xl shadow-warm">
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-background flex items-center justify-center">
            <svg
              className="w-6 h-6 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-sm font-medium">No responses yet</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Complete questions to build your timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
          <svg
            className="w-3 h-3 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
        <span className="text-sm font-medium text-foreground">
          Session Progress ({snippets.length} completed)
        </span>
      </div>

      <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
        {snippets.map((snippet, index) => {
          const hasAudio = snippet.audioBlob && snippet.audioBlob.size > 0;
          const isPlaying = playingId === snippet.id;

          return (
            <div
              key={snippet.id}
              className="p-4 bg-card border border-border rounded-xl hover:border-primary/30 
                         transition-all duration-200 shadow-warm hover:shadow-warm-lg"
            >
              <div className="flex items-start space-x-3">
                {/* Checkmark indicator */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Question */}
                  <div>
                    <span className="text-xs font-medium text-primary">Q{index + 1}</span>
                    <p className="text-sm text-foreground line-clamp-2 mt-0.5">{snippet.question}</p>
                  </div>

                  {/* Answer preview */}
                  <div className="pl-3 border-l-2 border-secondary">
                    <p className="text-xs text-muted-foreground line-clamp-2">{snippet.answer}</p>
                  </div>

                  {/* Audio controls */}
                  {hasAudio && (
                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        onClick={() => handlePlay(snippet)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                   transition-all ${
                                     isPlaying 
                                       ? 'bg-primary text-primary-foreground' 
                                       : 'text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80'
                                   }`}
                      >
                        {isPlaying ? (
                          <>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            <span>Play</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDownload(snippet, index)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium 
                                   text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 
                                   rounded-lg transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
