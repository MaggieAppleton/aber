import { AsyncLocalStorage } from 'node:async_hooks';

type SpendBudget = { limitUsd: number; spentUsd: number; reservedUsd: number; unknownCostUsd: number };
const budgets = new AsyncLocalStorage<SpendBudget>();

export class EvaluationBudgetExceededError extends Error {
  constructor() { super('Reviewed evaluation budget cannot cover the next request upper bound'); this.name = 'EvaluationBudgetExceededError'; }
}

export function withSpendBudget<T>(limitUsd: number, task: () => T): T {
  if (!Number.isFinite(limitUsd) || limitUsd <= 0) throw new Error('An evaluation needs a finite positive reviewed spending limit');
  if (budgets.getStore()) throw new Error('Evaluation budgets must not be nested');
  return budgets.run({ limitUsd, spentUsd: 0, reservedUsd: 0, unknownCostUsd: 0 }, task);
}

export function spendBudgetSnapshot(): Readonly<SpendBudget> | undefined {
  const budget = budgets.getStore();
  return budget ? { ...budget } : undefined;
}

/** Reserve the conservative billable upper bound before dispatch, across all databases and providers. */
export function reserveSpend(upperBoundUsd: number): { settle: (actualUsd: number) => void; unknown: () => void } {
  const budget = budgets.getStore();
  if (!budget) return { settle: () => {}, unknown: () => {} };
  if (!Number.isFinite(upperBoundUsd) || upperBoundUsd < 0) throw new Error('Missing conservative request cost bound');
  if (budget.spentUsd + budget.reservedUsd + upperBoundUsd > budget.limitUsd) throw new EvaluationBudgetExceededError();
  budget.reservedUsd += upperBoundUsd;
  let closed = false;
  return {
    settle(actualUsd) {
      if (closed) throw new Error('A spend reservation can only be settled once');
      if (!Number.isFinite(actualUsd) || actualUsd < 0) throw new Error('Invalid billable request cost');
      closed = true; budget.reservedUsd = Math.max(0, budget.reservedUsd - upperBoundUsd); budget.spentUsd += actualUsd;
      if (actualUsd > upperBoundUsd + 1e-12) throw new Error('Provider usage exceeded the reserved bound; stop evaluation and review pricing/token estimates');
    },
    unknown() {
      if (closed) return;
      closed = true; budget.reservedUsd = Math.max(0, budget.reservedUsd - upperBoundUsd);
      // Transport failures can still have been billed. Consume the full reservation.
      budget.spentUsd += upperBoundUsd; budget.unknownCostUsd += upperBoundUsd;
    },
  };
}
