// Core sorting engine: decide product availability, build the "available
// first, sold-out last, both groups internally stable" order, and turn that
// into the minimal set of moves collectionReorderProducts needs.
//
// Availability uses Shopify's own `availableForSale` field on
// ProductVariant (Product itself has no such field — verified against the
// 2026-07 schema), which already accounts for "continue selling when out
// of stock" and inventory tracking being disabled — we don't reimplement
// that logic by hand. A product is sold out only when every variant is
// unavailable; callers (cron.server.js) derive that boolean from the
// variants connection before calling this.

export function isProductSoldOut(product) {
  // product: { availableForSale: boolean } — already derived as
  // "some variant is available for sale" by the caller.
  return product.availableForSale === false;
}

/**
 * Builds the desired order for a collection: all currently-available
 * products first (in their existing relative order), then all sold-out
 * products (also in their existing relative order).
 *
 * @param {string[]} currentOrderIds - shopifyProductId[] in current collection order
 * @param {Set<string>} soldOutIds - shopifyProductId set of sold-out products in this collection
 * @returns {string[]} desired order
 */
export function buildStableGroups(currentOrderIds, soldOutIds) {
  const available = [];
  const soldOut = [];
  for (const id of currentOrderIds) {
    (soldOutIds.has(id) ? soldOut : available).push(id);
  }
  return [...available, ...soldOut];
}

/**
 * Diffs current vs desired order into the moves collectionReorderProducts
 * needs. Only positions that actually changed are included — for a stable
 * two-group partition (this is all DownStock ever does) that's correct,
 * because every move is still applied in ascending target-position order.
 *
 * NOTE: for very large collections this can still be a large move list in
 * the worst case (many small collections aside). Stage 7 (hardening) should
 * chunk this into batches (e.g. 250 moves at a time) and resume via the Job
 * table's `payload` cursor rather than sending one giant mutation — flagged
 * here rather than silently ignored.
 *
 * @param {string[]} currentOrderIds
 * @param {string[]} desiredOrderIds
 * @returns {{id: string, newPosition: string}[]}
 */
export function computeReorderMoves(currentOrderIds, desiredOrderIds) {
  const moves = [];
  desiredOrderIds.forEach((id, idx) => {
    if (currentOrderIds[idx] !== id) {
      moves.push({ id, newPosition: String(idx) });
    }
  });
  return moves;
}

/**
 * Restore-conflict policy for a single restocked product re-entering a
 * collection's available group. Mirrors the DownStock spec's anchor-first
 * strategy: prefer placing it right after its saved previous-neighbor if
 * that neighbor still exists in the collection; else right before its
 * saved next-neighbor; else fall back to a clamped original numeric index.
 *
 * @param {object} args
 * @param {string[]} args.currentOrderIds - collection order *excluding* the restored product
 * @param {string|null} args.previousAnchorProductId
 * @param {string|null} args.nextAnchorProductId
 * @param {number} args.originalPosition
 * @returns {number} insertion index into currentOrderIds
 */
export function resolveRestoreIndex({
  currentOrderIds,
  previousAnchorProductId,
  nextAnchorProductId,
  originalPosition,
}) {
  if (previousAnchorProductId) {
    const idx = currentOrderIds.indexOf(previousAnchorProductId);
    if (idx !== -1) return idx + 1;
  }
  if (nextAnchorProductId) {
    const idx = currentOrderIds.indexOf(nextAnchorProductId);
    if (idx !== -1) return idx;
  }
  return Math.max(0, Math.min(originalPosition, currentOrderIds.length));
}
