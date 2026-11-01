export function evaluationComplete(completed: number, requested: number, interrupted = false): boolean {
  return requested > 0 && completed === requested && !interrupted;
}

export function evaluationExitCode(completed: number, requested: number, failures: number): number {
  return evaluationComplete(completed, requested) && failures === 0 ? 0 : 1;
}
