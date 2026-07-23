// Thin adapter over node:assert so the ported tests keep the assertion names
// they were written against (Deno's @std/assert).
import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict'

/** Deep structural equality. */
export function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  deepStrictEqual(actual, expected, msg)
}

/** Reference / primitive strict equality (===). */
export function assertStrictEquals<T>(
  actual: T,
  expected: T,
  msg?: string
): void {
  strictEqual(actual, expected, msg)
}

/** Truthiness assertion. */
export function assert(expr: unknown, msg?: string): asserts expr {
  ok(expr, msg)
}
