import { TypeSafeClient } from '@typesafe-ai/sdk';
import { fakeChoice, withJevScript, type JevRequest } from '../server/src/agents/jev.js';
import { models } from '../server/src/agents/models.js';
import type { ProviderName } from '../server/src/agents/types.js';

export interface RequestObservation {
  model: string;
  state: unknown;
  questions: unknown;
  reversedChoiceCount: number;
}

export function reverseChoiceCriteria(request: JevRequest): JevRequest {
  return {
    ...request,
    questions: Object.fromEntries(Object.entries(request.questions).map(([id, question]) => [
      id, question.type === 'choice' ? { ...question, criteria: Object.fromEntries(Object.entries(question.criteria).reverse()) } : question,
    ])),
  };
}

/** Deliberately uncertain, hand-authored response: exercises fallback, not quality. */
export function uncertainJevResponse(request: JevRequest): unknown {
  return {
    model: request.model,
    answers: Object.fromEntries(Object.entries(request.questions).map(([id, question]) => {
      if (question.type === 'noul') return [id, { type: 'noul', noul: 0.5 }];
      if (question.type !== 'choice') throw new Error('Unsupported fake Jev primitive');
      const keys = Object.keys(question.criteria);
      return [id, fakeChoice(question.criteria, keys[0], 1 / keys.length + 1e-6)];
    })),
    usage: { input_tokens: 100, output_tokens: 0 },
  };
}

/**
 * Serial eval-only SDK boundary. In live mode reverse actual provider-bound
 * criteria, not saved answers, and invoke the original SDK once per request.
 */
export async function withJevEvaluation<T>(options: {
  fake: boolean; reverse: boolean; provider: ProviderName;
  script?: (request: JevRequest) => unknown | Promise<unknown>;
}, task: () => Promise<T>) {
  const requests: RequestObservation[] = [];
  const transform = (request: JevRequest) => {
    const transformed = options.reverse ? reverseChoiceCriteria(request) : request;
    requests.push({
      model: transformed.model, state: transformed.state, questions: transformed.questions,
      reversedChoiceCount: options.reverse ? Object.values(request.questions).filter(question => question.type === 'choice').length : 0,
    });
    return transformed;
  };
  const original = TypeSafeClient.prototype.systemOne;
  const primaryChat = models.chat.primary;
  if (options.provider === 'anthropic') models.chat.primary = models.chat.alternative;
  if (!options.fake) {
    TypeSafeClient.prototype.systemOne = (function (this: TypeSafeClient, request: JevRequest, ...rest: unknown[]) {
      return Reflect.apply(original, this, [transform(request), ...rest]);
    }) as typeof original;
  }
  try {
    const value = options.fake
      ? await withJevScript(request => (options.script ?? uncertainJevResponse)(transform(request)), task)
      : await task();
    return { value, requests };
  } finally {
    TypeSafeClient.prototype.systemOne = original;
    models.chat.primary = primaryChat;
  }
}
