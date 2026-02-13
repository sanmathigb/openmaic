'use client';

import { parseQuestion } from '@/lib/questionParser';

interface QuestionCardProps {
  questionNumber: number;
  question: string;
  isLoading?: boolean;
  onPlay?: () => void;
  isPlaying?: boolean;
  ttsEnabled?: boolean;
  onToggleTTS?: () => void;
}

export default function QuestionCard({ 
  questionNumber, 
  question, 
  isLoading = false,
  onPlay,
  isPlaying = false,
  ttsEnabled = true,
  onToggleTTS,
}: QuestionCardProps) {
  // Parse emotion metadata from question (handle null/undefined)
  const { emotion, question: cleanQuestion } = parseQuestion(question || '');
  
  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-8 bg-border rounded" />
          <div className="space-y-2">
            <div className="h-7 bg-border rounded w-full" />
            <div className="h-7 bg-border rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Question {questionNumber}
          </span>
          {/* Emotion tag - subtle indicator of the AI's energy */}
          {emotion && (
            <span className="text-xs text-primary/70">
              {emotion}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* TTS Toggle */}
          {onToggleTTS && (
            <button
              onClick={onToggleTTS}
              className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                ttsEnabled 
                  ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              title={ttsEnabled ? 'Voice enabled - click to disable' : 'Voice disabled - click to enable'}
            >
              <svg 
                className="w-3.5 h-3.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {ttsEnabled ? (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
                  />
                ) : (
                  <>
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" 
                    />
                  </>
                )}
              </svg>
              <span>{ttsEnabled ? 'On' : 'Off'}</span>
            </button>
          )}
          
          {/* Play/Stop Button */}
          {onPlay && (
            <button
              onClick={onPlay}
              disabled={isPlaying}
              className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                isPlaying 
                  ? 'bg-primary/20 text-primary cursor-default' 
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
              title={isPlaying ? 'Playing...' : 'Play question'}
            >
              <svg 
                className="w-3.5 h-3.5" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                {isPlaying ? (
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>
      <p className="text-2xl text-foreground leading-relaxed font-heading">
        {cleanQuestion}
      </p>
    </div>
  );
}
