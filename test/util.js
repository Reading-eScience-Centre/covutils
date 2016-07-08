import assert from 'assert'

export function assertAlmostEqual (x, y, precision) {
  assert.strictEqual(x.toPrecision(precision), y.toPrecision(precision))
}