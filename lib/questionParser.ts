/**
 * Parses a question that may contain emotion metadata
 * Format: "[emotion] question text" or just "question text"
 */
export interface ParsedQuestion {
  emotion: string | null;
  question: string;
  displayText: string; // Full text with emotion for display
}

export function parseQuestion(text: string): ParsedQuestion {
  // Match pattern: [emotion] rest of question
  // Using [\s\S] instead of . with /s flag for ES2015 compatibility
  const match = text.match(/^\[([^\]]+)\]\s*([\s\S]+)$/);
  
  if (match) {
    return {
      emotion: match[1].trim(),
      question: match[2].trim(),
      displayText: text,
    };
  }
  
  // No emotion metadata found
  return {
    emotion: null,
    question: text.trim(),
    displayText: text,
  };
}

/**
 * Cleans text for TTS by removing emotion metadata and other non-spoken elements
 */
export function cleanTextForTTS(text: string): string {
  // Remove emotion metadata: [emotion]
  let cleaned = text.replace(/^\[[^\]]+\]\s*/, '');
  
  // Remove stage directions: (leaning in, excited, etc.)
  cleaned = cleaned.replace(/\([^)]+\)/g, '');
  
  // Remove action markers: *smiles*, *pauses*
  cleaned = cleaned.replace(/\*[^*]+\*/g, '');
  
  // Add gentle pauses after sentence endings for more natural pacing
  cleaned = cleaned.replace(/([.!?])\s+/g, '$1 ... ');

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}
