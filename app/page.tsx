'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/session';

export default function Home() {
  const router = useRouter();
  const startSession = useSessionStore((state) => state.startSession);
  const [input, setInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || isStarting) return;

    setIsStarting(true);
    await startSession(input.trim());
    router.push('/session');
  };

  return (
    <main className="landing-shell">
      <section className="landing-stage" id="mic">
        <header className="landing-header">
          <div className="brand-lockup brand-lockup-large" aria-label="openmAIc">
            <span className="brand-wordmark">
              openm<span>AI</span>c
            </span>
          </div>
        </header>

        <div className="landing-copy">
          <p className="landing-subtitle">your AI wingman</p>
        </div>

        <form onSubmit={handleSubmit} className="landing-panel">
          <textarea
            id="project-input"
            aria-label="What you want to talk through"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="landing-textarea"
          />

          <button type="submit" disabled={!input.trim() || isStarting} className="landing-cta">
            {isStarting ? 'Preparing your first question...' : "ok! let's think aloud"}
          </button>
        </form>

        <a className="landing-hint" href="#story">
          first time here? read what this is &darr;
        </a>
      </section>

      <section className="landing-story" id="story">
        <div className="landing-story-section">
          <p className="landing-story-kicker">start here</p>
          <h2 className="landing-story-title">
            the podcast interview you were never invited to.
          </h2>
          <p>
            Great comedians test their material at tiny open mics — a joke starts
            as an idea, becomes a set, gets refined until it lands. Ideas work the
            same way. But most of us never get the room: not everyone can vlog,
            build an audience, or get invited onto a podcast.
          </p>
          <p>
            Everyone deserves good questions, though. Uninterrupted attention.
            Room to think out loud. So openmAIc gives you the seat.
          </p>
          <p>
            Paste whatever you have — a README, a one-pager, shower thoughts. A
            warm AI wingman asks you thoughtful questions, out loud, one at a
            time, building on what you say. Five questions later you&apos;re
            holding what a podcast guest holds: an episode of you, thinking out
            loud, at your best — in your own voice.
          </p>
        </div>

        <div className="landing-story-section">
          <p className="landing-story-kicker">how it works</p>
          <h2 className="landing-story-title">five questions. your voice. one episode.</h2>
          <ol className="landing-steps">
            <li>
              <strong>drop your blob</strong> — anything that captures what
              you&apos;re building or thinking.
            </li>
            <li>
              <strong>the wingman asks</strong> — one warm question, spoken
              aloud, grounded in what you wrote.
            </li>
            <li>
              <strong>you talk</strong> — record your answer; it&apos;s
              transcribed on the spot for you to review.
            </li>
            <li>
              <strong>it builds</strong> — each next question grows out of what
              you just said.
            </li>
            <li>
              <strong>you land</strong> — the final question brings the story
              home. Export your episode: audio, transcript, captions.
            </li>
          </ol>
        </div>

        <div className="landing-story-section">
          <p className="landing-story-kicker">why</p>
          <h2 className="landing-story-title">swap the spotlight.</h2>
          <p>
            Most AI tools are about getting more out of the model — more context,
            more memory, better prompts, more autonomous agents. openmAIc swaps
            the spotlight onto the human in the loop.
          </p>
          <p>
            In the world of agents, talk becomes valuable. The genuine voice of
            the creator — the founder, the human behind the app — only
            appreciates. AI&apos;s job here is to help you shine and get your
            points across. To amplify your voice, never replace it.
          </p>
          <p className="landing-story-line">
            Before you go viral, you have to get vocal.
          </p>
          <a className="landing-cta landing-cta-story" href="#mic">
            ok! let&apos;s think aloud &uarr;
          </a>
        </div>

        <footer className="landing-footer">
          free while it&apos;s young &middot; no accounts, no database &middot;
          your words and audio stay in your browser until you export
        </footer>
      </section>
    </main>
  );
}
