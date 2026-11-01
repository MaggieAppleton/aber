/** Budget pauses retain processing status so queued work resumes automatically. */
export function pendingDumpLabel(error?: string | null): string | undefined {
  return error && /daily.*spend cap/i.test(error) ? "Spend limit, resumes tomorrow" : undefined;
}
