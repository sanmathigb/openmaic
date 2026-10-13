# openmAIc

**your AI wingman. talk it out to figure it out.**

## What is this?

openmAIc is an open mic for builders — the podcast interview you were never
invited to.

Some of the greatest comedians test their material at small open mics before
they ever step on a big stage. A joke starts as an idea, becomes a set, gets
refined — the pauses change, the timing changes — until it becomes something
people remember. Ideas work the same way. But most of us never get the room:
not everyone can vlog, not everyone has an audience, not everyone gets invited
onto a podcast.

Everyone deserves good questions, though. So openmAIc gives you the seat.

You paste whatever you have — a README, a one-pager, shower thoughts, a
problem you can't stop thinking about. A warm AI wingman reads it and starts
asking you thoughtful questions, out loud, one at a time. You answer by
talking. It listens, and asks the next one, building on what you just said.
Five questions later you're holding what a podcast guest holds: an episode of
you, thinking out loud, at your best — in your own voice.

Most AI tools are about getting more out of the model — more context, more
memory, better prompts, more autonomous agents. openmAIc swaps the spotlight
onto the human in the loop. In a world full of agents, the genuine human
voice only becomes more valuable. So the AI creates the room, asks the
questions, and packages the result — but it is never the main character.
**You are.** AI should amplify your voice, not replace it.

Because before you go viral, you have to get vocal.

## How a session works

1. **Drop your blob** — paste anything that captures what you're building or
   thinking, and hit *"ok! let's think aloud."*
2. **The wingman asks** — one thoughtful question, spoken aloud, grounded in
   what you wrote (and later, in what you've said).
3. **You talk** — hit record and answer naturally, up to 5 minutes per take.
4. **Review** — your answer is transcribed on the spot; edit it if you like,
   then save and continue. Re-record if it didn't land.
5. **Repeat** — up to 5 questions. The final one is a landing question that
   helps you bring the story home.
6. **Take your episode with you** — export and share it yourself.

## What you leave with

- **Your recordings (MP3)** — every answer, stitched into one track.
- **Full podcast (MP3)** — the wingman's questions and your answers,
  interleaved. This is the episode.
- **Raw session ZIP** — every take plus transcript and metadata, ready to
  drop into an editor like Descript.
- **Transcript (Markdown)** — the whole conversation as text.
- **LinkedIn pack (ZIP)** — audio + SRT/VTT captions + transcript +
  ES/FR translations, ready to post.

## Privacy, by architecture

There are no accounts, no waitlist, and no database. Your session lives in
your browser: audio stays in memory, text in localStorage. The only things
that leave your machine are the API calls that power the experience
(questions, transcription, voice). Nothing is stored server-side. Close the
tab and the audio is gone — export first.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your keys
npm run dev                        # open http://localhost:3000
```

Keys for `.env.local`:

| Variable | Purpose | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | The wingman's questions (Claude) | [Anthropic Console](https://console.anthropic.com/) |
| `ANTHROPIC_MODEL` | Optional; defaults to `claude-opus-4-8` | — |
| `DEEPGRAM_API_KEY` | Transcribing your answers | [Deepgram Console](https://console.deepgram.com/) |
| `ELEVENLABS_API_KEY` | The wingman's voice | [ElevenLabs](https://elevenlabs.io/) |

## Limits

- Up to **5 questions** per session
- Up to **5 minutes** per answer
- One session at a time — finish and export before starting fresh

## Tech

Next.js 14 (App Router) · Tailwind CSS · Zustand · Claude (questions) ·
Deepgram Nova-2 (speech-to-text) · ElevenLabs (text-to-speech) · Web Audio +
lamejs (in-browser MP3 stitching) · JSZip (packs). API routes are thin,
rate-limited proxies; all audio processing happens in your browser.

```
app/
├── page.tsx                # landing — drop your blob
├── session/page.tsx        # the room — questions, recording, review
└── api/
    ├── question/route.ts   # wingman questions (Claude)
    ├── transcribe/route.ts # speech-to-text (Deepgram)
    ├── tts/route.ts        # wingman voice (ElevenLabs)
    └── translate/route.ts  # pack translations (Claude)
components/                 # SessionSummary (exports), ThemeProvider
hooks/                      # useAudioRecorder, useTTSPlayer
lib/                        # claude, deepgram, elevenlabsTTS, audioExport,
                            # mp3Encode, captions, mediaPack, questionParser,
                            # rateLimit
store/session.ts            # session state (Zustand + localStorage)
types/                      # shared interfaces
```

## Roadmap

- **Now (phase 1):** good questions, your voice, your episode. Free and
  rate-limited.
- **Next (phase 2):** bring your own Anthropic key to skip the limits ·
  the wingman does its homework (recent context via web search) · one-click
  polish to a captioned audiogram for socials.

## Deployment

Vercel is the recommended host. Set `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`,
and `ELEVENLABS_API_KEY` as environment variables before deploying.

## License

MIT
