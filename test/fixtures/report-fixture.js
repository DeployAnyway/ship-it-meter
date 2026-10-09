import test from "node:test";
import assert from "node:assert/strict";
import { value } from "./value.js";
test("real code is tested", () => {
  assert.equal(value(1), 2);
  assert.equal(value(-1), 0);
});
test.skip("unfinished test is not evidence", () => {});
