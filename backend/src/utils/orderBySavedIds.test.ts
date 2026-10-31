import { test } from "node:test";
import assert from "node:assert/strict";
import { orderBySavedIds } from "./orderBySavedIds";

// Plain objects stand in for hotel documents. Strings have toString(),
// so we do not need mongoose here.
const hotelA = { _id: "a1", name: "Hotel A" };
const hotelB = { _id: "b2", name: "Hotel B" };
const hotelC = { _id: "c3", name: "Hotel C" };

test("empty saved list returns an empty list", () => {
  const result = orderBySavedIds([], [hotelA, hotelB]);
  assert.deepEqual(result, []);
});

test("returns newest saved first, even when docs arrive in a different order", () => {
  // Saved order is a, b, c (c was saved last). Mongo returned the docs as b, a, c.
  const savedIds = ["a1", "b2", "c3"];
  const docs = [hotelB, hotelA, hotelC];

  const result = orderBySavedIds(savedIds, docs);

  assert.deepEqual(result, [hotelC, hotelB, hotelA]);
});

test("saved id with no matching doc (deleted hotel) is skipped", () => {
  const savedIds = ["a1", "gone9", "c3"];
  const docs = [hotelA, hotelC];

  const result = orderBySavedIds(savedIds, docs);

  assert.deepEqual(result, [hotelC, hotelA]);
});

test("docs that are not in the saved list are dropped", () => {
  const savedIds = ["a1", "c3"];
  const docs = [hotelA, hotelB, hotelC];

  const result = orderBySavedIds(savedIds, docs);

  assert.deepEqual(result, [hotelC, hotelA]);
});

test("a duplicated saved id yields the doc only once", () => {
  const savedIds = ["a1", "b2", "a1"];
  const docs = [hotelA, hotelB];

  const result = orderBySavedIds(savedIds, docs);

  assert.equal(result.length, 2);
  // Hotel A appears exactly once.
  const countOfA = result.filter((hotel) => hotel._id === "a1").length;
  assert.equal(countOfA, 1);
});

test("does not mutate the inputs", () => {
  const savedIds = ["a1", "b2", "c3"];
  const docs = [hotelB, hotelA, hotelC];

  orderBySavedIds(savedIds, docs);

  assert.deepEqual(savedIds, ["a1", "b2", "c3"]);
  assert.deepEqual(docs, [hotelB, hotelA, hotelC]);
});
