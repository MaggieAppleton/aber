export type BaseArm = 'off' | 'shadow' | 'on';

export function selectedArms(args: string[]): BaseArm[] {
  const index = args.indexOf('--arms');
  if (index < 0) return ['off', 'shadow', 'on'];
  const arms = args[index + 1]?.split(',') ?? [];
  if (!arms.length || new Set(arms).size !== arms.length || arms.some(arm => !['off', 'shadow', 'on'].includes(arm))) {
    throw new Error('--arms needs a nonempty comma-separated selection of off,shadow,on without duplicates');
  }
  if (args.lastIndexOf('--arms') !== index) throw new Error('Supply --arms only once');
  return arms as BaseArm[];
}

export function selectedOrderCases(args: string[], ids: string[], arms: BaseArm[]): Set<string> {
  const index = args.indexOf('--order-cases');
  if (index >= 0 && args.includes('--no-order-check')) throw new Error('--order-cases conflicts with --no-order-check');
  if (index < 0) return new Set(args.includes('--no-order-check') || !arms.includes('on') ? [] : ids);
  const selected = args[index + 1]?.split(',') ?? [];
  if (!arms.includes('on') || !selected.length || new Set(selected).size !== selected.length || selected.some(id => !ids.includes(id))) {
    throw new Error('--order-cases requires the on arm and distinct case IDs from the selected suite/split');
  }
  return new Set(selected);
}

export function reviewedBudget(args: string[], fake: boolean): number {
  const index = args.indexOf('--budget');
  if (!fake && (!args.includes('--acknowledge-paid-budget') || index < 0)) {
    throw new Error('Live evaluation is disabled: supply --budget <finite USD> AND --acknowledge-paid-budget after explicit spending approval. --fake makes no paid calls.');
  }
  const value = index < 0 ? 1 : Number(args[index + 1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error('--budget needs a finite positive USD amount');
  return value;
}

export function withJevModes<T>(mode: 'off' | 'shadow' | 'on', task: () => Promise<T>): Promise<T> {
  const keys = ['JEV_MODE', ...['LINK_EVIDENCE', 'TRIPWIRE', 'NEAR_DUP', 'PROCESS_DUMP', 'CHAT'].map(job => `JEV_${job}_MODE`)];
  const previous = keys.map(key => process.env[key]);
  keys.forEach(key => { process.env[key] = mode; });
  return task().finally(() => keys.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
  }));
}
