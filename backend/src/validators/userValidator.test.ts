import { test } from "node:test";
import assert from "node:assert/strict";
import { validateWishlistAdd, validateWishlistHotelId } from "./userValidator";

// A valid Mongo ObjectId is exactly 24 hex characters.
const VALID_ID = "507f1f77bcf86cd799439011";
const SHORT_ID = "507f1f77bcf86cd79943901"; // 23 characters

// Both validators return null when the input is fine, or an error string when it is not.
const assertIsError = (result: string | null) => {
  assert.equal(typeof result, "string");
  assert.ok(result !== null && result.length > 0);
};

// ---------- validateWishlistAdd (reads the request body) ----------

test("validateWishlistAdd: valid ObjectId returns null", () => {
  assert.equal(validateWishlistAdd({ hotelId: VALID_ID }), null);
});

test("validateWishlistAdd: undefined body returns an error (Express 5 can leave req.body undefined)", () => {
  assertIsError(validateWishlistAdd(undefined));
});

test("validateWishlistAdd: null body returns an error", () => {
  assertIsError(validateWishlistAdd(null));
});

test("validateWishlistAdd: empty object returns an error", () => {
  assertIsError(validateWishlistAdd({}));
});

test("validateWishlistAdd: missing hotelId returns an error", () => {
  assertIsError(validateWishlistAdd({ somethingElse: VALID_ID }));
});

test("validateWishlistAdd: hotelId that is not an ObjectId returns an error", () => {
  assertIsError(validateWishlistAdd({ hotelId: "abc" }));
});

test("validateWishlistAdd: 23-character hex hotelId returns an error", () => {
  assertIsError(validateWishlistAdd({ hotelId: SHORT_ID }));
});

test("validateWishlistAdd: hotelId as a number returns an error", () => {
  assertIsError(validateWishlistAdd({ hotelId: 12345 }));
});

// ---------- validateWishlistHotelId (reads req.params) ----------

test("validateWishlistHotelId: valid ObjectId returns null", () => {
  assert.equal(validateWishlistHotelId({ hotelId: VALID_ID }), null);
});

test("validateWishlistHotelId: undefined params returns an error", () => {
  assertIsError(validateWishlistHotelId(undefined));
});

test("validateWishlistHotelId: null params returns an error", () => {
  assertIsError(validateWishlistHotelId(null));
});

test("validateWishlistHotelId: empty object returns an error", () => {
  assertIsError(validateWishlistHotelId({}));
});

test("validateWishlistHotelId: missing hotelId returns an error", () => {
  assertIsError(validateWishlistHotelId({ somethingElse: VALID_ID }));
});

test("validateWishlistHotelId: hotelId that is not an ObjectId returns an error", () => {
  assertIsError(validateWishlistHotelId({ hotelId: "abc" }));
});

test("validateWishlistHotelId: 23-character hex hotelId returns an error", () => {
  assertIsError(validateWishlistHotelId({ hotelId: SHORT_ID }));
});

test("validateWishlistHotelId: hotelId as a number returns an error", () => {
  assertIsError(validateWishlistHotelId({ hotelId: 12345 }));
});
