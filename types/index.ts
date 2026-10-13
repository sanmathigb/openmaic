/**
 * Represents a Q&A pair from the interview session
 */
export interface Snippet {
  /** Unique identifier for the snippet */
  id: string;
  /** The question asked by the AI interviewer */
  question: string;
  /** The user's answer (transcribed from audio) */
  answer: string;
  /** Audio blob of the user's recording (not persisted, memory only) */
  audioBlob?: Blob;
  /** TTS audio of the question (not persisted, memory only) */
  questionAudioBlob?: Blob;
  /** Timestamp when the snippet was created */
  timestamp: Date;
}

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export interface TranslationPack {
  [lang: string]: {
    transcriptMd: string;
    srt: string;
    vtt: string;
  };
}

export interface MediaPackManifest {
  title: string;
  description: string;
  durationSeconds: number;
  createdAt: string;
  platform: 'linkedin';
  languages: string[];
}

/**
 * Represents an interview practice session
 */
export interface Session {
  /** Unique identifier for the session */
  id: string;
  /** Description of the project being discussed */
  projectDescription: string;
  /** Array of Q&A snippets from the session */
  snippets: Snippet[];
  /** Timestamp when the session was created */
  createdAt: Date;
  /** Timestamp when the session was last updated */
  updatedAt: Date;
}
