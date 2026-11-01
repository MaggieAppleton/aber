import '../config.js';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

// Explicit provider instances keep requests off AI Gateway. Missing keys fail only
// when a live request is made, so fake mode needs no credentials.
export const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
