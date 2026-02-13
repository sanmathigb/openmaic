'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/session';

type SessionMode = 'share' | 'think';

export default function Home() {
  const router = useRouter();
  const startSession = useSessionStore((state) => state.startSession);
  const [mode, setMode] = useState<SessionMode>('share');
  const [input, setInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStarting) return;

    setIsStarting(true);
    await startSession(input.trim(), mode);
    router.push('/session');
  };

  const placeholder = "Docs, PRDs, READMEs, journal entries, work logs, raw thoughts, half-formed ideas, screenshots, links — whatever captures what you're building or thinking.";

  return (
    <div className="min-h-screen bg-background">
      <main className="min-h-screen px-6 py-16 md:py-24">
        <div className="mx-auto w-full max-w-2xl">
          {/* Hero */}
          <header className="mb-16 text-center">
            <h1 className="text-6xl md:text-8xl leading-none text-foreground font-bold tracking-[0.25em] uppercase">
              OPENM<span className="text-primary">AI</span>C
            </h1>
            <p className="mt-4 text-xl md:text-2xl font-handwritten text-primary">
              your AI wingman.
            </p>
            <p className="mt-4 text-base text-muted-foreground max-w-md mx-auto">
              Talk through your ideas. Get challenged with sharp questions.
              Build clarity, one conversation at a time.
            </p>
          </header>

          {/* Mode Selection */}
          <div className="mb-8 flex gap-3 justify-center">
            <button
              onClick={() => setMode('share')}
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 outline-none ${
                mode === 'share'
                  ? 'bg-foreground text-white'
                  : 'bg-transparent text-foreground border border-border hover:border-foreground'
              }`}
            >
              🎙️ Spotlight
            </button>
            <button
              onClick={() => setMode('think')}
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 outline-none ${
                mode === 'think'
                  ? 'bg-foreground text-white'
                  : 'bg-transparent text-foreground border border-border hover:border-foreground'
              }`}
            >
              💡 Soundboard
            </button>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="h-48 w-full resize-none rounded-xl border border-border bg-background px-5 py-4 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStarting}
              className="w-full rounded-xl bg-primary px-6 py-4 text-base font-bold text-white transition-all duration-200 hover:bg-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isStarting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Getting ready...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Let your thoughts flow
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
