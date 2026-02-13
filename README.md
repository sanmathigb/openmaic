# openmAIc

**your AI wingman. talk it out to figure it out.**

An AI-powered "open mic" for builders. Describe what you're building, an AI interviewer asks thoughtful questions, you speak your answers, and you export your session as audio + captions + transcript.

## Features

- AI-generated interview questions powered by Claude
- Voice recording with browser MediaRecorder API
- Real-time transcription via Deepgram
- Session persistence with localStorage
- MP3 export of your recordings and mixed podcast
- LinkedIn pack export (captions + transcript + translations)
- Warm, minimal UI

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API keys

Copy the example environment file and add your API keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your keys:
- **ANTHROPIC_API_KEY** - Get from [Anthropic Console](https://console.anthropic.com/)
- **DEEPGRAM_API_KEY** - Get from [Deepgram Console](https://console.deepgram.com/) (free tier: 12,000 mins)

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a description of your project on the landing page
2. Click "Start Session" to begin
3. Read the AI-generated question
4. Click the record button and speak your answer
5. Review your transcript and confirm or re-record
6. Continue with the next question
7. Use "Skip Question" if you want a different question
8. Click "End Session" when done
9. Export MP3 or the LinkedIn pack

## Exports

LinkedIn pack includes:
- `audio-*.mp3` (full session audio)
- `captions.en.srt` / `captions.en.vtt`
- `transcript.en.md`
- `translations/es/*` and `translations/fr/*`
- `meta.json`

## Limits

- Max recording length: 5 minutes
- Max questions per session: 10

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **AI Questions**: Claude API (Opus)
- **Transcription**: Deepgram API (Nova-2)
- **TTS**: Deepgram Aura
- **Translations**: Claude API
- **Audio Capture**: Browser MediaRecorder API
- **State Management**: Zustand with localStorage persistence

## Project Structure

```
openmaic/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── session/page.tsx            # Main interview session
│   ├── api/
│   │   ├── question/route.ts       # Generate AI questions
│   │   └── transcribe/route.ts     # Audio transcription
│   │   ├── tts/route.ts            # TTS audio
│   │   └── translate/route.ts      # Captions translations
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ProjectInput.tsx            # Initial description form
│   ├── QuestionCard.tsx            # Displays current question
│   ├── RecordButton.tsx            # Recording button with states
│   ├── TranscriptView.tsx          # Shows/confirms transcript
│   ├── SnippetTimeline.tsx         # List of completed Q&As
│   └── SessionControls.tsx         # Skip/End session buttons
├── lib/
│   ├── claude.ts                   # Claude API wrapper
│   └── deepgram.ts                 # Deepgram API wrapper
│   ├── deepgramTTS.ts              # Deepgram TTS wrapper
│   ├── audioExport.ts              # MP3 export helpers
│   ├── mp3Encode.ts                # MP3 encoder (lamejs)
│   ├── captions.ts                 # SRT/VTT utilities
│   └── mediaPack.ts                # LinkedIn pack utilities
├── hooks/
│   └── useAudioRecorder.ts         # Recording state management
├── store/
│   └── session.ts                  # Zustand session store
└── types/
    └── index.ts                    # TypeScript interfaces

## Deployment

Vercel is the recommended host. Add `ANTHROPIC_API_KEY` and `DEEPGRAM_API_KEY` as environment variables before deploying.
```

## License

MIT
