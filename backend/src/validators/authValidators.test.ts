import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSignup } from "./authValidators";

// A signup body that passes every check; each test changes one field.
const validBody = {
  userName: "aman_k",
  name: "Aman Kumar",
  email: "aman@example.com",
  password: "Passw0rdOk",
};

test("validateSignup: a valid body returns null", () => {
  assert.equal(validateSignup(validBody), null);
});

test("validateSignup: an email without @ returns the email error", () => {
  assert.equal(validateSignup({ ...validBody, email: "not-an-email" }), "Email address is not valid");
});

test("validateSignup: an email without a domain returns the email error", () => {
  assert.equal(validateSignup({ ...validBody, email: "aman@" }), "Email address is not valid");
});

test("validateSignup: an email with spaces returns the email error", () => {
  assert.equal(validateSignup({ ...validBody, email: "am an@example.com" }), "Email address is not valid");
});

test("validateSignup: a missing email still says it is required", () => {
  assert.equal(validateSignup({ ...validBody, email: undefined }), "Email is required");
});
