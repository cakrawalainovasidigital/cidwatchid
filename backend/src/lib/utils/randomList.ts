export function randomList<T>(items: T[], limit?: number): T[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  if (limit == null) return copy;
  const safeLimit = Math.max(0, Math.min(copy.length, Math.floor(limit)));
  return copy.slice(0, safeLimit);
}
