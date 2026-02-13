import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session, Snippet, SessionMode } from '@/types';

interface SessionState {
  // Session data
  session: Session | null;

  // UI state
  isLoading: boolean;
  isGeneratingQuestion: boolean;
  currentQuestion: string | null;
  error: string | null;

  // Actions
  startSession: (projectDescription: string, mode?: SessionMode) => Promise<void>;
  addSnippet: (question: string, answer: string, audioBlob?: Blob, questionAudioBlob?: Blob) => void;
  generateQuestionTTS: (question: string) => Promise<Blob | null>;
  setCurrentQuestion: (question: string | null) => void;
  generateNextQuestion: () => Promise<void>;
  skipQuestion: () => Promise<void>;
  endSession: () => void;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      session: null,
      isLoading: false,
      isGeneratingQuestion: false,
      currentQuestion: null,
      error: null,

      // Actions
      startSession: async (projectDescription: string, mode: SessionMode = 'think') => {
        set({ isLoading: true, error: null });

        try {
          const newSession: Session = {
            id: crypto.randomUUID?.() ?? Date.now().toString(),
            projectDescription,
            mode,
            snippets: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          set({ session: newSession, isLoading: false });

          // Generate the first question
          await get().generateNextQuestion();
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to start session',
          });
        }
      },

      addSnippet: (question: string, answer: string, audioBlob?: Blob, questionAudioBlob?: Blob) => {
        const { session } = get();
        if (!session) return;

        const newSnippet: Snippet = {
          id: crypto.randomUUID?.() ?? Date.now().toString(),
          question,
          answer,
          audioBlob,
          questionAudioBlob,
          timestamp: new Date(),
        };

        set({
          session: {
            ...session,
            snippets: [...session.snippets, newSnippet],
            updatedAt: new Date(),
          },
        });
      },

      generateQuestionTTS: async (question: string): Promise<Blob | null> => {
        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: question, voice: 'luna' }),
          });

          if (!response.ok) {
            console.error('TTS generation failed:', response.statusText);
            return null;
          }

          const audioData = await response.arrayBuffer();
          return new Blob([audioData], { type: 'audio/wav' });
        } catch (error) {
          console.error('TTS error:', error);
          return null;
        }
      },

      setCurrentQuestion: (question: string | null) => {
        set({ currentQuestion: question });
      },

      skipQuestion: async () => {
        const { session } = get();
        if (!session) return;

        set({ isGeneratingQuestion: true, error: null });

        try {
          await get().generateNextQuestion();
        } catch (error) {
          set({
            isGeneratingQuestion: false,
            error: error instanceof Error ? error.message : 'Failed to skip question',
          });
        }
      },

      generateNextQuestion: async () => {
        const { session } = get();
        if (!session) return;

        set({ isGeneratingQuestion: true, error: null });

        try {
          const response = await fetch('/api/question', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectDescription: session.projectDescription,
              mode: session.mode,
              snippets: session.snippets,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to generate question');
          }

          const data = await response.json();

          set({
            isGeneratingQuestion: false,
            currentQuestion: data.question,
          });
        } catch (error) {
          set({
            isGeneratingQuestion: false,
            error: error instanceof Error ? error.message : 'Failed to generate question',
          });
        }
      },

      endSession: () => {
        set({
          session: null,
          currentQuestion: null,
          isLoading: false,
          isGeneratingQuestion: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'openmaic-session',
      // Only persist session data, not UI state
      partialize: (state) => ({
        session: state.session,
      }),
      // Handle date serialization/deserialization with SSR safety
      storage: createJSONStorage(() => {
        // SSR safety check
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return {
          getItem: (name: string) => {
            const str = localStorage.getItem(name);
            if (!str) return null;

            const parsed = JSON.parse(str);
            if (parsed.state?.session) {
              // Rehydrate dates
              parsed.state.session.createdAt = new Date(parsed.state.session.createdAt);
              parsed.state.session.updatedAt = new Date(parsed.state.session.updatedAt);
              parsed.state.session.snippets = parsed.state.session.snippets.map(
                (snippet: Snippet) => ({
                  ...snippet,
                  timestamp: new Date(snippet.timestamp),
                })
              );
            }
            return JSON.stringify(parsed);
          },
          setItem: (name: string, value: string) => {
            localStorage.setItem(name, value);
          },
          removeItem: (name: string) => {
            localStorage.removeItem(name);
          },
        };
      }),
    }
  )
);
