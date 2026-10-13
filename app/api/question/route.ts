import { NextRequest, NextResponse } from 'next/server';
import { generateQuestion, ClaudeError, MAX_QUESTIONS } from '@/lib/claude';
import { Snippet } from '@/types';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

/**
 * Request body structure for the question generation endpoint
 */
interface QuestionRequestBody {
  projectDescription: string;
  snippets: Snippet[];
}

/**
 * Validates the request body structure
 */
function validateRequestBody(body: unknown): body is QuestionRequestBody {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const { projectDescription, snippets } = body as Record<string, unknown>;

  if (typeof projectDescription !== 'string') {
    return false;
  }

  if (!Array.isArray(snippets)) {
    return false;
  }

  // Validate each snippet has required fields
  for (const snippet of snippets) {
    if (!snippet || typeof snippet !== 'object') {
      return false;
    }
    const { question, answer } = snippet as Record<string, unknown>;
    if (typeof question !== 'string' || typeof answer !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * POST /api/question
 *
 * Generates the next interview question based on project description and conversation history.
 *
 * Request: JSON body with { projectDescription: string, snippets: Snippet[] }
 * Response: { question: string } on success
 *           { error: string } on failure
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.question.maxRequests, RATE_LIMITS.question.windowMs);
    
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          }
        }
      );
    }

    // Parse the JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Failed to parse JSON body:', error);
      return NextResponse.json(
        { error: 'Invalid request: expected JSON body with projectDescription and snippets' },
        { status: 400 }
      );
    }

    // Validate the request body
    if (!validateRequestBody(body)) {
      console.error('Invalid request body structure:', body);
      return NextResponse.json(
        { error: 'Invalid request body: expected { projectDescription: string, snippets: Snippet[] }' },
        { status: 400 }
      );
    }

    const { projectDescription, snippets } = body;

    // Validate project description is not empty
    if (!projectDescription.trim()) {
      console.error('Empty project description provided');
      return NextResponse.json(
        { error: 'Project description cannot be empty' },
        { status: 400 }
      );
    }

    // Validate project description length (prevent abuse)
    if (projectDescription.length > 10000) {
      return NextResponse.json(
        { error: 'Project description too long (max 10,000 characters)' },
        { status: 400 }
      );
    }

    // Enforce session limit
    if (snippets.length >= MAX_QUESTIONS) {
      return NextResponse.json(
        { error: `Session limit reached (max ${MAX_QUESTIONS} questions).` },
        { status: 400 }
      );
    }

    console.log(`Generating question for project with ${snippets.length} previous snippets`);

    // Generate the next question using Claude
    const question = await generateQuestion(projectDescription, snippets);

    console.log(`Question generated successfully: "${question.substring(0, 50)}..."`);

    return NextResponse.json({ question });
  } catch (error) {
    // Handle Claude-specific errors
    if (error instanceof ClaudeError) {
      console.error('Claude API error:', {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response,
      });

      // Map Claude status codes to appropriate HTTP responses
      const statusCode = error.statusCode || 500;

      if (statusCode === 401 || statusCode === 403) {
        return NextResponse.json(
          { error: 'AI service authentication failed. Please check API configuration.' },
          { status: 503 }
        );
      }

      if (statusCode === 429) {
        return NextResponse.json(
          { error: 'AI service rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (statusCode === 529) {
        return NextResponse.json(
          { error: 'AI service is temporarily overloaded. Please try again later.' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: `Question generation failed: ${error.message}` },
        { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
      );
    }

    // Handle unexpected errors
    console.error('Unexpected error in question route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while generating the question. Please try again.' },
      { status: 500 }
    );
  }
}
