'use client';

import { useState, useEffect } from 'react';

interface TranscriptViewProps {
  transcript: string;
  onConfirm: (editedTranscript: string) => void;
  onReRecord: () => void;
  isLoading?: boolean;
  isConfirming?: boolean;
  isTranscribing?: boolean;
}

export default function TranscriptView({
  transcript,
  onConfirm,
  onReRecord,
  isLoading = false,
  isConfirming = false,
  isTranscribing = false,
}: TranscriptViewProps) {
  const [editedText, setEditedText] = useState(transcript);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditedText(transcript);
  }, [transcript]);

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-border rounded w-full" />
          <div className="h-5 bg-border rounded w-5/6" />
          <div className="h-5 bg-border rounded w-4/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Status indicator */}
      {isTranscribing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>Transcribing...</span>
        </div>
      )}

      {/* Transcript */}
      <div className="space-y-3">
        {isEditing ? (
          <div className="relative">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              autoFocus
              className="w-full min-h-[120px] p-4 bg-background text-foreground text-lg leading-relaxed
                         resize-none focus:outline-none border-2 border-primary rounded-xl
                         focus:ring-2 focus:ring-primary/20 transition-all shadow-warm"
            />
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
              Editing mode
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="min-h-[80px] p-4 bg-card rounded-xl border border-border hover:border-primary/50
                       transition-colors cursor-text group shadow-warm"
          >
            <p className="text-foreground text-lg leading-relaxed">
              {editedText}
            </p>
            <p className="text-xs text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to edit
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onConfirm(editedText)}
          disabled={isConfirming}
          className="flex-1 py-3 bg-primary hover:bg-accent text-primary-foreground font-medium 
                     rounded-xl disabled:opacity-50 transition-all active:scale-[0.98]
                     shadow-warm hover:shadow-warm-lg"
        >
          {isConfirming ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            'Save & Continue'
          )}
        </button>
        <button
          onClick={onReRecord}
          disabled={isConfirming}
          className="px-6 py-3 text-muted-foreground hover:text-foreground hover:bg-muted 
                     rounded-xl transition-all disabled:opacity-50 font-medium"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Redo
          </span>
        </button>
      </div>
    </div>
  );
}
