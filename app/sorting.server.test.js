import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isProductSoldOut,
  buildStableGroups,
  computeReorderMoves,
  resolveRestoreIndex,
} from "./sorting.server.js";

test("isProductSoldOut: false availableForSale is sold out", () => {
  assert.equal(isProductSoldOut({ availableForSale: false }), true);
  assert.equal(isProductSoldOut({ availableForSale: true }), false);
});

test("buildStableGroups: preserves relative order within each group", () => {
  const order = ["A", "B", "C", "D", "E", "F"];
  const soldOut = new Set(["B", "D", "F"]);
  assert.deepEqual(buildStableGroups(order, soldOut), ["A", "C", "E", "B", "D", "F"]);
});

test("buildStableGroups: no sold-out products is a no-op", () => {
  const order = ["A", "B", "C"];
  assert.deepEqual(buildStableGroups(order, new Set()), ["A", "B", "C"]);
});

test("buildStableGroups: everything sold out is a no-op", () => {
  const order = ["A", "B", "C"];
  assert.deepEqual(buildStableGroups(order, new Set(order)), ["A", "B", "C"]);
});

test("computeReorderMoves: only changed positions are included", () => {
  const current = ["A", "B", "C", "D", "E", "F"];
  const desired = ["A", "C", "E", "B", "D", "F"];
  const moves = computeReorderMoves(current, desired);
  // F never moves (already last in both); A never moves (already first).
  assert.deepEqual(
    moves.map((m) => m.id),
    ["C", "E", "B", "D"],
  );
  assert.deepEqual(moves[0], { id: "C", newPosition: "1" });
});

test("computeReorderMoves: identical order produces zero moves", () => {
  const order = ["A", "B", "C"];
  assert.deepEqual(computeReorderMoves(order, order), []);
});

test("resolveRestoreIndex: places after surviving previous anchor", () => {
  const idx = resolveRestoreIndex({
    currentOrderIds: ["A", "B", "C"],
    previousAnchorProductId: "B",
    nextAnchorProductId: "Z", // gone — should be ignored since previous wins
    originalPosition: 0,
  });
  assert.equal(idx, 2); // right after B
});

test("resolveRestoreIndex: falls back to next anchor when previous is gone", () => {
  const idx = resolveRestoreIndex({
    currentOrderIds: ["A", "B", "C"],
    previousAnchorProductId: "ZZZ",
    nextAnchorProductId: "C",
    originalPosition: 0,
  });
  assert.equal(idx, 2); // right before C
});

test("resolveRestoreIndex: falls back to clamped original position when both anchors gone", () => {
  const idx = resolveRestoreIndex({
    currentOrderIds: ["A", "B"],
    previousAnchorProductId: "GONE1",
    nextAnchorProductId: "GONE2",
    originalPosition: 99,
  });
  assert.equal(idx, 2); // clamped to array length
});

test("resolveRestoreIndex: no anchors at all uses original position directly", () => {
  const idx = resolveRestoreIndex({
    currentOrderIds: ["A", "B", "C", "D"],
    previousAnchorProductId: null,
    nextAnchorProductId: null,
    originalPosition: 1,
  });
  assert.equal(idx, 1);
});
