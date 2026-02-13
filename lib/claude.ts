/**
 * Claude API wrapper for AI-powered interview question generation
 */

import { Snippet } from '@/types';

/**
 * Represents a message in the Claude API conversation
 */
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Represents the response structure from Claude's messages API
 */
interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Error class for Claude API errors
 */
export class ClaudeError extends Error {
  public statusCode?: number;
  public response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = 'ClaudeError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

type ModeType = 'share' | 'think';

/**
 * Mode-specific system prompts - the red carpet interview philosophy
 * 
 * The core insight: This isn't just an interview. It's their moment of fame.
 * The AI is the hype person, the spotlight operator, making them feel like 
 * a star being interviewed about their inevitable success BEFORE they've achieved it.
 * 
 * Why wait until you made it? You are successful before the success.
 */
const MODE_PROMPTS: Record<ModeType, string> = {
  share: `You are conducting a red carpet interview with someone who is about to blow up. Your energy is warm, genuinely excited, and focused entirely on THEM. You're the spotlight operator.

OUTPUT FORMAT - You MUST respond in this exact format and nothing else:
<emotion>Warm, excited, genuinely curious</emotion>
<question>Your actual question here</question>

Constraints:
- Output ONLY the two tags above. No other text.
- Ask ONE primary question. A short follow-up clause is allowed if it feels natural, but keep it tight.
- Ground it in specific details from their project or prior answers.
- No preamble. The question should feel confident and direct.

Tone & cadence:
- They are the star. You’re giving them the mic.
- Hype them up without being cheesy. Genuine curiosity is the best hype.
- Short punchy sentences feel energetic.
- You may add a soft closing at the end (e.g., "if that makes sense?" / "if you had to pick?") to make it feel human.

Example moves:
- "What part of this are you most excited to show the world right now?"
- "Who’s the person who’s going to feel seen by this first — and why?"
- "What makes you the one to pull this off?"
- "What does wild success look like, in your own words?"`,

  think: `You are having a deep conversation with someone figuring things out. Your energy is patient, warm, and completely judgment-free. You're creating a safe space for their thoughts to flow.

OUTPUT FORMAT - You MUST respond in this exact format and nothing else:
<emotion>Patient, gentle, creating space</emotion>
<question>Your actual question here</question>

Constraints:
- Output ONLY the two tags above. No other text.
- Ask ONE primary question. A short follow-up clause is allowed if it feels natural, but keep it gentle and simple.
- Ground it in specific details from their project or prior answers.
- Avoid advice or conclusions; only ask a question that invites reflection.

Tone & cadence:
- This is their thinking session. You’re the curious friend who asks the question that unlocks clarity.
- Use softer language: "wondering," "curious," "noticing."
- Ellipses (...) can suggest gentle pauses.
- You may add a soft closing at the end (e.g., "if that feels true?" / "if you want to go there?").

Example angles:
- "What is the thing you keep circling back to, and what draws you there?"
- "What feels stuck right now — and what might loosen it, even a little?"
- "What are you not saying out loud yet?"
- "If you had to choose today, where would you lean?"`
};

/**
 * Formats the conversation history from snippets into a readable format
 *
 * @param snippets - Array of Q&A snippets from the session
 * @returns Formatted conversation history string
 */
function formatConversationHistory(snippets: Snippet[]): string {
  if (snippets.length === 0) {
    return '';
  }

  return snippets
    .map((snippet, index) => {
      return `Q${index + 1}: ${snippet.question}\nA${index + 1}: ${snippet.answer}`;
    })
    .join('\n\n');
}

/**
 * Builds the messages array for the Claude API request
 *
 * @param projectDescription - Description of the project being discussed
 * @param snippets - Previous Q&A pairs from the session
 * @returns Array of messages for the Claude API
 */
function buildMessages(
  projectDescription: string,
  snippets: Snippet[]
): ClaudeMessage[] {
  const messages: ClaudeMessage[] = [];

  // First user message: project description
  let initialMessage = `I'm building a project and would like your help thinking through it.\n\nProject Description:\n${projectDescription}`;

  // If there's conversation history, include it
  const history = formatConversationHistory(snippets);
  if (history) {
    initialMessage += `\n\nHere's our conversation so far:\n\n${history}`;
    initialMessage += '\n\nPlease ask me your next question based on our conversation.';
  } else {
    initialMessage += '\n\nPlease ask me your first question to help me think through this project.';
  }

  messages.push({
    role: 'user',
    content: initialMessage,
  });

  return messages;
}

/**
 * Generates the next interview question using Claude AI
 *
 * @param projectDescription - Description of the project being discussed
 * @param snippets - Previous Q&A pairs from the session
 * @returns The generated question text
 * @throws ClaudeError if the API request fails or returns an error
 *
 * @example
 * ```typescript
 * import { generateQuestion } from '@/lib/claude';
 *
 * const question = await generateQuestion(
 *   'A mobile app for tracking plant watering schedules',
 *   []
 * );
 * console.log(question); // "What problem are you trying to solve..."
 * ```
 */
export async function generateQuestion(
  projectDescription: string,
  snippets: Snippet[],
  mode: ModeType = 'think'
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new ClaudeError(
      'ANTHROPIC_API_KEY environment variable is not set'
    );
  }

  const messages = buildMessages(projectDescription, snippets);
  const systemPrompt = MODE_PROMPTS[mode];

  let response: Response;

  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'messages-2023-12-15',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });
  } catch (error) {
    throw new ClaudeError(
      `Failed to connect to Claude API: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }

    throw new ClaudeError(
      `Claude API request failed with status ${response.status}: ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  let data: ClaudeResponse;

  try {
    data = await response.json() as ClaudeResponse;
  } catch (error) {
    throw new ClaudeError(
      `Failed to parse Claude API response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Extract the text from the first content block
  const textContent = data.content?.find((block) => block.type === 'text');

  if (!textContent || !textContent.text) {
    throw new ClaudeError(
      'No text content found in Claude response',
      undefined,
      data
    );
  }

  // Parse the structured output
  const emotionMatch = textContent.text.match(/<emotion>([\s\S]*?)<\/emotion>/);
  const questionMatch = textContent.text.match(/<question>([\s\S]*?)<\/question>/);

  if (questionMatch) {
    const emotion = emotionMatch ? emotionMatch[1].trim() : '';
    const question = questionMatch[1].trim();
    
    // Return question with emotion metadata embedded for the frontend to parse
    return emotion ? `[${emotion}] ${question}` : question;
  }

  // Fallback: if no structured format, return the raw text
  return textContent.text.trim();
}
