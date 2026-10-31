// Mongo's $in returns documents in its own order, not the saved order.
// This puts them back in saved order, newest saved first.
export const orderBySavedIds = <T extends { _id: { toString(): string } }>(
  savedIds: { toString(): string }[],
  docs: T[]
): T[] => {
  // Look docs up by id so each saved id is a single lookup
  const docsById = new Map<string, T>();
  for (const doc of docs) {
    docsById.set(doc._id.toString(), doc);
  }

  const ordered: T[] = [];
  const alreadyAdded = new Set<string>();

  for (let i = savedIds.length - 1; i >= 0; i--) {
    const savedId = savedIds[i].toString();
    const doc = docsById.get(savedId);

    // Skip ids whose hotel was deleted, and ids saved twice
    if (doc && !alreadyAdded.has(savedId)) {
      ordered.push(doc);
      alreadyAdded.add(savedId);
    }
  }

  return ordered;
};
