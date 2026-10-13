'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import SessionSummary from '@/components/SessionSummary';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTTSPlayer } from '@/hooks/useTTSPlayer';
import { parseQuestion } from '@/lib/questionParser';
import { useSessionStore } from '@/store/session';

type SessionPhase = 'recording' | 'transcribing' | 'reviewing';

// Keep in sync with MAX_QUESTIONS in lib/claude.ts.
const MAX_SNIPPETS = 5;
const MAX_RECORDING_SECONDS = 300;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function SessionPage() {
  const router = useRouter();

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

  const {
    isRecording,
    duration,
    audioBlob,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder(MAX_RECORDING_SECONDS);

  const {
    isPlaying: isPlayingTTS,
    play: playTTS,
    stop: stopTTS,
    enabled: ttsEnabled,
    setEnabled: setTtsEnabled,
  } = useTTSPlayer();

  const [phase, setPhase] = useState<SessionPhase>('recording');
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [currentQuestionTTS, setCurrentQuestionTTS] = useState<Blob | null>(null);

  const [playingSnippetId, setPlayingSnippetId] = useState<string | null>(null);
  const snippetAudioRef = useRef<HTMLAudioElement | null>(null);
  const snippetAudioUrlRef = useRef<string | null>(null);

  const lastTranscribedBlobRef = useRef<Blob | null>(null);
  const playedQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !session) {
      router.push('/');
    }
  }, [isHydrated, session, router]);

  useEffect(() => {
    if (!ttsEnabled || !currentQuestion || currentQuestionTTS || isGeneratingQuestion) return;

    generateQuestionTTS(currentQuestion).then((blob) => {
      if (blob) {
        setCurrentQuestionTTS(blob);
      }
    });
  }, [currentQuestion, currentQuestionTTS, generateQuestionTTS, isGeneratingQuestion, ttsEnabled]);

  useEffect(() => {
    if (!ttsEnabled || !currentQuestionTTS || isRecording || phase !== 'recording') return;
    if (playedQuestionRef.current === currentQuestion) return;
    playedQuestionRef.current = currentQuestion;
    playTTS(currentQuestionTTS);
  }, [currentQuestion, currentQuestionTTS, isRecording, phase, playTTS, ttsEnabled]);

  const cleanupSnippetAudio = useCallback(() => {
    if (snippetAudioRef.current) {
      snippetAudioRef.current.pause();
      snippetAudioRef.current.onended = null;
      snippetAudioRef.current = null;
    }
    if (snippetAudioUrlRef.current) {
      URL.revokeObjectURL(snippetAudioUrlRef.current);
      snippetAudioUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupSnippetAudio();
  }, [cleanupSnippetAudio]);

  const questionNumber = session ? session.snippets.length + 1 : 1;
  const isAtSnippetLimit = session ? session.snippets.length >= MAX_SNIPPETS : false;

  const transcribeBlob = useCallback(async (blob: Blob) => {
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
      setTranscriptionError(error instanceof Error ? error.message : 'Failed to transcribe audio');
      setPhase('recording');
      lastTranscribedBlobRef.current = null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  useEffect(() => {
    if (!audioBlob || audioBlob === lastTranscribedBlobRef.current) return;
    transcribeBlob(audioBlob);
  }, [audioBlob, transcribeBlob]);

  const handleRetryTranscription = useCallback(() => {
    if (!audioBlob || isTranscribing) return;
    transcribeBlob(audioBlob);
  }, [audioBlob, isTranscribing, transcribeBlob]);

  const handleConfirm = useCallback(async (editedTranscript: string) => {
    if (!currentQuestion || !editedTranscript || isConfirming) return;

    setIsConfirming(true);
    try {
      addSnippet(currentQuestion, editedTranscript, audioBlob || undefined, currentQuestionTTS || undefined);

      setTranscript('');
      setPhase('transcribing');
      setCurrentQuestionTTS(null);
      lastTranscribedBlobRef.current = null;
      resetRecording();

      if (session && session.snippets.length + 1 >= MAX_SNIPPETS) {
        setShowSummary(true);
        return;
      }

      await generateNextQuestion();
      setPhase('recording');
    } finally {
      setIsConfirming(false);
    }
  }, [addSnippet, audioBlob, currentQuestion, currentQuestionTTS, generateNextQuestion, isConfirming, resetRecording, session]);

  const handleReRecord = useCallback(() => {
    setTranscript('');
    setTranscriptionError(null);
    setPhase('recording');
    lastTranscribedBlobRef.current = null;
    resetRecording();
  }, [resetRecording]);

  const handleSkip = useCallback(async () => {
    if (isAtSnippetLimit) return;
    setTranscript('');
    setTranscriptionError(null);
    setPhase('recording');
    setCurrentQuestionTTS(null);
    lastTranscribedBlobRef.current = null;
    resetRecording();
    await generateNextQuestion();
  }, [generateNextQuestion, isAtSnippetLimit, resetRecording]);

  const handleEndSession = useCallback(() => {
    setShowSummary(true);
  }, []);

  const handleCloseSummary = useCallback(() => {
    stopTTS();
    cleanupSnippetAudio();
    endSession();
    router.push('/');
  }, [cleanupSnippetAudio, endSession, router, stopTTS]);

  const handleToggleTTS = useCallback(() => {
    if (ttsEnabled) {
      stopTTS();
      setTtsEnabled(false);
      return;
    }

    setTtsEnabled(true);
    if (currentQuestionTTS) {
      playTTS(currentQuestionTTS);
    }
  }, [currentQuestionTTS, playTTS, setTtsEnabled, stopTTS, ttsEnabled]);

  const handlePlaySnippet = useCallback((snippetId: string, blob?: Blob) => {
    if (!blob) return;

    if (playingSnippetId === snippetId) {
      cleanupSnippetAudio();
      setPlayingSnippetId(null);
      return;
    }

    cleanupSnippetAudio();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    snippetAudioRef.current = audio;
    snippetAudioUrlRef.current = url;
    setPlayingSnippetId(snippetId);

    audio.onended = () => {
      cleanupSnippetAudio();
      setPlayingSnippetId(null);
    };

    audio.play().catch(() => {
      cleanupSnippetAudio();
      setPlayingSnippetId(null);
    });
  }, [cleanupSnippetAudio, playingSnippetId]);

  const displayError = storeError || recorderError || transcriptionError;
  const limitMessage = isAtSnippetLimit ? `Session limit reached (${MAX_SNIPPETS} prompts).` : null;
  const canRetryTranscription = Boolean(transcriptionError && audioBlob && !isTranscribing);

  const parsedQuestion = useMemo(() => parseQuestion(currentQuestion || ''), [currentQuestion]);
  const transcriptReady = phase === 'reviewing' && transcript.trim().length > 0;

  if (!isHydrated) {
    return <main className="session-shell session-loading">Loading session...</main>;
  }

  if (!session) {
    return <main className="session-shell session-loading">Redirecting...</main>;
  }

  return (
    <main className="session-shell">
      <div className="session-noise" aria-hidden="true" />

      <header className="session-header">
        <div>
          <div className="brand-lockup brand-lockup-compact" aria-label="openmAIc">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="brand-wordmark">
              openm<span>AI</span>c
            </span>
          </div>
          <p className="session-kicker">Guided founder interview</p>
          <h1 className="session-title">Prompt {questionNumber}</h1>
        </div>
        <button className="session-link" onClick={handleEndSession}>
          Finish
        </button>
      </header>

      <section className="session-grid">
        <article className="session-main-card">
          {(displayError || limitMessage) && (
            <div className="session-alert" role="alert">
              <p>{displayError || limitMessage}</p>
              <div className="session-alert-actions">
                {canRetryTranscription && (
                  <button className="session-link" onClick={handleRetryTranscription}>
                    Retry transcription
                  </button>
                )}
                {displayError && (
                  <button
                    className="session-link"
                    onClick={() => {
                      clearError();
                      setTranscriptionError(null);
                    }}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="session-question-head">
            <div>
              <p className="session-kicker">Question {questionNumber}</p>
              {parsedQuestion.emotion ? <p className="session-emotion">{parsedQuestion.emotion}</p> : null}
            </div>
            <div className="session-inline-controls">
              <button className="session-pill" onClick={handleToggleTTS}>
                Voice {ttsEnabled ? 'on' : 'off'}
              </button>
              <button
                className="session-pill"
                onClick={() => currentQuestionTTS && playTTS(currentQuestionTTS)}
                disabled={!currentQuestionTTS || isPlayingTTS}
              >
                {isPlayingTTS ? 'Playing...' : 'Play prompt'}
              </button>
            </div>
          </div>

          <h2 className="session-question">
            {isGeneratingQuestion ? 'Generating next question...' : parsedQuestion.question || 'Preparing your first question...'}
          </h2>

          <p className="session-boost">
            Answer naturally, review the transcript, and keep moving until the story feels clear.
          </p>

          <div className="session-recorder-wrap">
            {!transcriptReady && (
              <>
                <button
                  className={`session-record ${isRecording ? 'is-recording' : ''}`}
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                      return;
                    }
                    setTranscriptionError(null);
                    stopTTS();
                    startRecording();
                  }}
                  disabled={isGeneratingQuestion || !currentQuestion || isAtSnippetLimit || isTranscribing}
                >
                  {isTranscribing ? 'Transcribing...' : isRecording ? 'Stop recording' : 'Record answer'}
                </button>

                <p className="session-recorder-meta">
                  {isRecording ? `Recording ${formatDuration(duration)}` : `Up to ${Math.floor(MAX_RECORDING_SECONDS / 60)} min per response`}
                </p>
              </>
            )}

            {transcriptReady && (
              <TranscriptEditor
                transcript={transcript}
                isConfirming={isConfirming}
                onConfirm={handleConfirm}
                onReRecord={handleReRecord}
              />
            )}
          </div>

          <div className="session-actions-row">
            <button
              className="session-link"
              onClick={handleSkip}
              disabled={isRecording || isTranscribing || isConfirming || isGeneratingQuestion || isAtSnippetLimit}
            >
              Skip question
            </button>
          </div>
        </article>

        <aside className="session-side-card">
          <p className="session-kicker">Your momentum</p>
          <h3 className="session-side-title">
            {session.snippets.length} response{session.snippets.length === 1 ? '' : 's'} captured
          </h3>

          {session.snippets.length === 0 && (
            <p className="session-empty">Confirmed responses appear here as you build the session.</p>
          )}

          <ul className="session-snippets">
            {session.snippets.map((snippet, index) => (
              <li key={snippet.id} className="session-snippet-item">
                <p className="session-snippet-label">Q{index + 1}</p>
                <p className="session-snippet-question">{snippet.question}</p>
                <p className="session-snippet-answer">{snippet.answer}</p>
                {snippet.audioBlob && (
                  <button
                    className="session-link"
                    onClick={() => handlePlaySnippet(snippet.id, snippet.audioBlob)}
                  >
                    {playingSnippetId === snippet.id ? 'Stop audio' : 'Play audio'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {showSummary && <SessionSummary session={session} onClose={handleCloseSummary} />}
    </main>
  );
}

interface TranscriptEditorProps {
  transcript: string;
  isConfirming: boolean;
  onConfirm: (editedTranscript: string) => void;
  onReRecord: () => void;
}

function TranscriptEditor({ transcript, isConfirming, onConfirm, onReRecord }: TranscriptEditorProps) {
  const [edited, setEdited] = useState(transcript);

  useEffect(() => {
    setEdited(transcript);
  }, [transcript]);

  return (
    <div className="session-transcript-wrap">
      <label htmlFor="transcript-edit" className="session-kicker">
        Review transcript
      </label>
      <textarea
        id="transcript-edit"
        value={edited}
        onChange={(event) => setEdited(event.target.value)}
        className="session-transcript"
      />
      <div className="session-transcript-actions">
        <button className="session-record" onClick={() => onConfirm(edited.trim())} disabled={isConfirming || !edited.trim()}>
          {isConfirming ? 'Saving...' : 'Save and continue'}
        </button>
        <button className="session-link" onClick={onReRecord} disabled={isConfirming}>
          Re-record
        </button>
      </div>
    </div>
  );
}
