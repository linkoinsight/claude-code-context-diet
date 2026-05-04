import { test } from "node:test";
import { strict as assert } from "node:assert";
import { compress, makeState, DEFAULT_CONFIG } from "../src/index.js";

test("dedupe: identical Read of same path returns placeholder", () => {
  const state = makeState();
  const event1 = { toolName: "Read", input: { path: "/tmp/foo.txt" }, result: "hello\n".repeat(100) };
  const out1 = compress(event1, state, DEFAULT_CONFIG);
  assert.equal(out1.appliedTransforms.length, 0);

  const event2 = { toolName: "Read", input: { path: "/tmp/foo.txt" }, result: "hello\n".repeat(100) };
  const out2 = compress(event2, state, DEFAULT_CONFIG);
  assert.deepEqual(out2.appliedTransforms, ["dedupe"]);
  assert.match(out2.toolEvent.result, /identical to a result returned earlier/);
});

test("truncate: oversize Bash result keeps head + tail", () => {
  const state = makeState();
  const big = "X".repeat(100_000);
  const event = { toolName: "Bash", input: {}, result: big };
  const out = compress(event, state, DEFAULT_CONFIG);
  assert.ok(out.appliedTransforms.includes("truncate"));
  assert.ok(out.bytesAfter < out.bytesBefore);
  assert.match(out.toolEvent.result, /truncated/);
});

test("strip: collapses multiple blank lines", () => {
  const state = makeState();
  const event = { toolName: "Bash", input: {}, result: "line1\n\n\n\n\nline2\n" };
  const out = compress(event, state, DEFAULT_CONFIG);
  assert.equal(out.toolEvent.result, "line1\n\nline2\n");
});

test("small results pass through unchanged", () => {
  const state = makeState();
  const event = { toolName: "Bash", input: {}, result: "ok\n" };
  const out = compress(event, state, DEFAULT_CONFIG);
  assert.equal(out.toolEvent.result, "ok\n");
  assert.equal(out.appliedTransforms.length, 0);
});

test("non-string results pass through gracefully", () => {
  const state = makeState();
  const event = { toolName: "Bash", input: {}, result: null };
  const out = compress(event, state, DEFAULT_CONFIG);
  assert.equal(out.toolEvent.result, null);
});
