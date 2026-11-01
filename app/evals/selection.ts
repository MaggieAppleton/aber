export function selectCases<T extends { id: string }>(fixtures: T[], args: string[]): T[] {
  const index = args.indexOf('--case');
  if (index < 0) return fixtures;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error('--case needs comma-separated fixture IDs');
  const ids = [...new Set(value.split(',').map(id => id.trim()).filter(Boolean))];
  if (!ids.length) throw new Error('--case needs at least one fixture ID');
  const unknown = ids.filter(id => !fixtures.some(fixture => fixture.id === id));
  if (unknown.length) throw new Error(`Unknown eval case: ${unknown.join(', ')}`);
  return fixtures.filter(fixture => ids.includes(fixture.id));
}
