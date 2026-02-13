# openmAIc Architecture

## Overview
openmAIc is a Next.js 14 app with a browser-first UI and a small set of API routes that proxy to Claude and Deepgram. Sessions are stored in `localStorage` (no server DB yet). Exports are generated in the browser.

## Data Flow
1. User enters a project description.
2. `/api/question` calls Claude to generate a question.
3. User records audio in the browser (MediaRecorder).
4. `/api/transcribe` calls Deepgram to transcribe audio.
5. User confirms transcript; snippet is saved to Zustand + localStorage.
6. Repeat until session ends.
7. Exports (MP3 + captions + transcript + translations) are generated client-side.

## API Endpoints
- `POST /api/question`  
  Generates next question using Claude.
- `POST /api/transcribe`  
  Transcribes audio using Deepgram.
- `POST /api/tts`  
  Generates TTS for questions using Deepgram Aura.
- `POST /api/translate`  
  Translates captions/transcript using Claude.

## Key Modules
- `store/session.ts`: session state, persistence, question generation.
- `hooks/useAudioRecorder.ts`: MediaRecorder wrapper with duration limits.
- `lib/claude.ts`: Claude wrapper + prompt structure.
- `lib/deepgram.ts`: transcription wrapper.
- `lib/deepgramTTS.ts`: TTS wrapper.
- `lib/audioExport.ts`: MP3 export utilities.
- `lib/mp3Encode.ts`: MP3 encoding via lamejs.
- `lib/captions.ts`: SRT/VTT generation.
- `lib/mediaPack.ts`: LinkedIn pack assembly helpers.

## Limits & Rate Limiting
- Recording length: 5 minutes
- Max questions: 10
- Rate limiting per endpoint via in-memory store (`lib/rateLimit.ts`).

## Security Notes
- API keys are only in environment variables.
- No keys are logged.
- Client data stored in localStorage only (no server persistence).
