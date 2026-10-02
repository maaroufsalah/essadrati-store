/**
 * Rank updates for a drag-and-drop reorder. `ids` must contain every
 * existing id exactly once (a stale admin list is refused rather than
 * leaving gaps): returns null otherwise. Ranks become 0, 1, 2...
 */
export function rankUpdates(
  existingIds: readonly string[],
  ids: readonly string[],
): { id: string; rank: number }[] | null {
  const known = new Set(existingIds);
  if (ids.length !== known.size || new Set(ids).size !== ids.length) return null;
  if (!ids.every((id) => known.has(id))) return null;
  return ids.map((id, rank) => ({ id, rank }));
}
