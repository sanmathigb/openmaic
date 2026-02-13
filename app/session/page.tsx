'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  QuestionCard,
  RecordButton,
  TranscriptView,
  SnippetTimeline,
  SessionControls,
  SessionSummary,
} from '@/components';
import { useSessionStore } from '@/store/session';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useDeepgramTTSPlayer } from '@/hooks/useDeepgramTTSPlayer';

type SessionPhase = 'recording' | 'transcribing' | 'reviewing';

const MAX_SNIPPETS = 10;
const MAX_RECORDING_SECONDS = 300;

export default function SessionPage() {
  const router = useRouter();

  // Session store
  const {
    session,
    isGeneratingQuestion,
    currentQuestion,
    error: storeError,
    addSnippet,
    generateNextQuestion,
    generateQuestionTTS,
    endSession,
    clearError,
  } = useSessionStore();

  // Audio recorder hook
  const {
    isRecording,
    duration,
    audioBlob,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder(MAX_RECORDING_SECONDS);

  // TTS player hook
  const {
    isPlaying: isPlayingTTS,
    play: playTTS,
    stop: stopTTS,
    enabled: ttsEnabled,
    setEnabled: setTtsEnabled,
  } = useDeepgramTTSPlayer();

  // Local state
  const [phase, setPhase] = useState<SessionPhase>('recording');
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Track which blob we've already transcribed to prevent double-transcription
  const lastTranscribedBlobRef = useRef<Blob | null>(null);
  
  // Store TTS audio for current question
  const [currentQuestionTTS, setCurrentQuestionTTS] = useState<Blob | null>(null);

  // Handle hydration - check for session on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Redirect if no session after hydration
  useEffect(() => {
    if (isHydrated && !session) {
      router.push('/');
    }
  }, [isHydrated, session, router]);

  // Generate TTS for current question (background)
  useEffect(() => {
    if (!ttsEnabled) return;
    if (currentQuestion && !currentQuestionTTS && !isGeneratingQuestion) {
      generateQuestionTTS(currentQuestion).then((blob) => {
        if (blob) {
          setCurrentQuestionTTS(blob);
        }
      });
    }
  }, [currentQuestion, isGeneratingQuestion, currentQuestionTTS, generateQuestionTTS, ttsEnabled]);

  // Auto-play TTS when it loads
  useEffect(() => {
    if (!ttsEnabled) return;
    if (currentQuestionTTS && !isRecording && phase === 'recording') {
      playTTS(currentQuestionTTS);
    }
  }, [currentQuestionTTS, isRecording, phase, playTTS, ttsEnabled]);

  const questionNumber = session ? session.snippets.length + 1 : 1;
  const isAtSnippetLimit = session ? session.snippets.length >= MAX_SNIPPETS : false;

  const transcribeBlob = useCallback(async (blob: Blob) => {
    if (!blob) return;

    setIsTranscribing(true);
    setTranscriptionError(null);
    setPhase('transcribing');
    lastTranscribedBlobRef.current = blob;

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data = await response.json();
      setTranscript(data.transcript || '');
      setPhase('reviewing');
    } catch (error) {
      setTranscriptionError(
        error instanceof Error ? error.message : 'Failed to transcribe audio'
      );
      setPhase('recording');
      lastTranscribedBlobRef.current = null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  // Transcribe audio when we get a new blob
  useEffect(() => {
    // Only transcribe if we have a new blob we haven't processed yet
    if (!audioBlob || audioBlob === lastTranscribedBlobRef.current) {
      return;
    }

    transcribeBlob(audioBlob);
  }, [audioBlob, transcribeBlob]);

  const handleRetryTranscription = useCallback(() => {
    if (!audioBlob || isTranscribing) return;
    transcribeBlob(audioBlob);
  }, [audioBlob, isTranscribing, transcribeBlob]);

  // Handle confirm transcript with edited text
  const handleConfirm = useCallback(async (editedTranscript: string) => {
    if (!currentQuestion || !editedTranscript || isConfirming) return;

    setIsConfirming(true);
    try {
      // Add snippet to session with audio blobs (user recording + question TTS)
      addSnippet(currentQuestion, editedTranscript, audioBlob || undefined, currentQuestionTTS || undefined);

      // Reset local state for next recording
      setTranscript('');
      setPhase('recording');
      lastTranscribedBlobRef.current = null;
      setCurrentQuestionTTS(null);
      resetRecording();

      // Generate next question unless we've hit the session limit
      if (session && session.snippets.length + 1 >= MAX_SNIPPETS) {
        setShowSummary(true);
        return;
      }

      await generateNextQuestion();
    } finally {
      setIsConfirming(false);
    }
  }, [currentQuestion, audioBlob, currentQuestionTTS, isConfirming, addSnippet, resetRecording, generateNextQuestion, session]);

  // Handle re-record
  const handleReRecord = useCallback(() => {
    setTranscript('');
    setTranscriptionError(null);
    setPhase('recording');
    lastTranscribedBlobRef.current = null;
    resetRecording();
  }, [resetRecording]);

  // Handle skip question - just generates a new question without saving
  const handleSkip = useCallback(async () => {
    setTranscript('');
    setTranscriptionError(null);
    setPhase('recording');
    lastTranscribedBlobRef.current = null;
    setCurrentQuestionTTS(null);
    resetRecording();
    await generateNextQuestion();
  }, [resetRecording, generateNextQuestion]);

  // Handle end session - show summary first
  const handleEndSession = useCallback(() => {
    setShowSummary(true);
  }, []);

  // Handle close summary and actually end
  const handleCloseSummary = useCallback(() => {
    endSession();
    router.push('/');
  }, [endSession, router]);

  // Combine errors
  const displayError = storeError || recorderError || transcriptionError;
  const limitMessage = isAtSnippetLimit
    ? `Session limit reached (${MAX_SNIPPETS} questions).`
    : null;
  const canRetryTranscription = Boolean(transcriptionError && audioBlob && !isTranscribing);

  // Loading state during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  // No session (will redirect)
  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold tracking-[0.2em] uppercase text-foreground">
            OPENM<span className="text-primary">AI</span>C
          </span>
          <button
            onClick={handleEndSession}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Done
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Left Side - Main Interview Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl space-y-8">
            {/* Error Display */}
            {(displayError || limitMessage) && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <svg
                      className="w-5 h-5 text-destructive mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-destructive">{displayError || limitMessage}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canRetryTranscription && (
                      <button
                        onClick={handleRetryTranscription}
                        className="text-sm text-destructive/80 hover:text-destructive/70 border border-destructive/40 px-2 py-1 rounded-md"
                      >
                        Retry
                      </button>
                    )}
                    {displayError && (
                      <button
                        onClick={() => {
                          clearError();
                          setTranscriptionError(null);
                        }}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Question Card */}
            <QuestionCard
              questionNumber={questionNumber}
              question={currentQuestion || ''}
              isLoading={isGeneratingQuestion}
              onPlay={currentQuestionTTS ? () => playTTS(currentQuestionTTS) : undefined}
              isPlaying={isPlayingTTS}
              ttsEnabled={ttsEnabled}
              onToggleTTS={() => {
                if (ttsEnabled) {
                  stopTTS();
                }
                setTtsEnabled(!ttsEnabled);
              }}
            />

            {/* Recording/Transcript Area */}
            <div className="flex flex-col items-center space-y-6">
              {phase === 'reviewing' && transcript ? (
                <TranscriptView
                  transcript={transcript}
                  onConfirm={handleConfirm}
                  onReRecord={handleReRecord}
                  isConfirming={isConfirming}
                />
              ) : (
                <RecordButton
                  isRecording={isRecording}
                  duration={duration}
                  isProcessing={isTranscribing}
                  onStart={() => {
                    setTranscriptionError(null);
                    stopTTS();
                    startRecording();
                  }}
                  onStop={stopRecording}
                  disabled={isGeneratingQuestion || !currentQuestion || isAtSnippetLimit}
                />
              )}
            </div>

            {/* Session Controls */}
            <div className="pt-4">
              <SessionControls
                onSkip={handleSkip}
                onEnd={handleEndSession}
                disabled={isRecording || isTranscribing || isConfirming || isGeneratingQuestion || isAtSnippetLimit}
              />
            </div>
          </div>
        </div>

        {/* Right Side - Snippet Timeline */}
        <aside className="hidden lg:block w-96 border-l border-border bg-muted/30 p-6 overflow-y-auto">
          <SnippetTimeline snippets={session.snippets} />
        </aside>
      </main>

      {/* Mobile Timeline (shown at bottom on smaller screens) */}
      <div className="lg:hidden border-t border-border bg-muted/30 p-4 max-h-64 overflow-y-auto">
        <SnippetTimeline snippets={session.snippets} />
      </div>

      {/* Session Summary Modal */}
      {showSummary && session && (
        <SessionSummary
          session={session}
          onClose={handleCloseSummary}
        />
      )}
    </div>
  );
}
